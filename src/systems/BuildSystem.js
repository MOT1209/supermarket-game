import * as THREE from 'three';
import {
  catalogItem,
  isShelfType,
  normalizeRotation,
  productAllowed,
  validatePlacement,
  shelfDataFromSpot,
  nextFreeSpot
} from '../data/build.js';
import { maxSpots } from '../data/products.js';
import { createShelfMesh } from '../world/ShelfFactory.js';
import { createFixtureMesh } from '../world/FixtureFactory.js';
import { rounded } from '../utils/math.js';

export default class BuildSystem {
  constructor(game) {
    this.game = game;
    this.enabled = false;
    this.catalogType = 'shelf';
    this.productId = 'milk'; // changed by the build bar's product picker
    this.rotation = 0;
    this.ghost = null;
    this.ghostValid = false;
    this.moveTarget = null; // { kind: 'fixture'|'shelf', id }
  }

  start() {
    this.enabled = true;
    this.game.setMode('playing'); // keep playing movement
    this.ensureGhost();
    this.updateGhost();
    this.game.ui?.buildUI?.show?.();
  }

  stop() {
    this.enabled = false;
    this.removeGhost();
    this.moveTarget = null;
    this.game.ui?.buildUI?.hide?.();
  }

  toggle() {
    if (this.enabled) this.stop();
    else this.start();
  }

  setCatalog(type) {
    if (!catalogItem(type)) return;
    this.catalogType = type;
    this.ensureGhost();
    this.updateGhost();
  }

  setProduct(pid) {
    if (!productAllowed(this.game, pid)) return;
    this.productId = pid;
  }

  rotate() {
    this.rotation = normalizeRotation(this.rotation + Math.PI / 2);
    this.updateGhost();
  }

  ensureGhost() {
    if (this.ghost) {
      this.game.scene.remove(this.ghost);
      this.ghost.traverse((o) => {
        if (o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => m.dispose?.());
        }
        if (o.geometry) o.geometry.dispose?.();
      });
      this.ghost = null;
    }
    const item = catalogItem(this.catalogType);
    if (!item) return;
    const g = new THREE.Group();
    // simple ghost mesh
    const color = isShelfType(this.catalogType) ? 0x6aa0ff : 0x9adf9a;
    const geo = new THREE.BoxGeometry(item.width, 0.6, item.depth);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.3;
    g.add(mesh);
    g.visible = false;
    this.game.scene.add(g);
    this.ghost = g;
  }

  getWorldPositionFromPlayer() {
    const p = this.game.player.pos;
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.game.camera.quaternion);
    const dist = 2.2;
    return { x: p.x + dir.x * dist, z: p.z + dir.z * dist };
  }

  updateGhost() {
    if (!this.enabled || !this.ghost) return;
    const pos = this.getWorldPositionFromPlayer();
    const x = pos.x;
    const z = pos.z;
    this.ghost.position.set(x, 0, z);
    this.ghost.rotation.y = this.rotation;
    const res = this.validateAt(x, z, this.rotation);
    this.ghostValid = !!res.ok;
    const color = this.ghostValid ? 0x6bff8f : 0xff6b6b;
    this.ghost.traverse((o) => {
      if (o.isMesh && o.material) o.material.color.setHex(color);
    });
    this.ghost.visible = true;
  }

  validateAt(x, z, rot) {
    const item = catalogItem(this.catalogType);
    if (!item) return { ok: false, reason: 'Unknown item' };
    const game = this.game;
    const level = game.state.level || 1;
    const colliders = game.world.storeColliders || game.world.colliders || [];
    const shelves = game.runtime.shelves.map((s) => ({
      spot: s.spot,
      x: s.x,
      z: s.z,
      rot: s.rot,
      fridge: s.fridge,
      freezer: s.freezer
    }));
    const fixtures = (game.runtime.fixtures || []).map((f) => ({
      id: f.id,
      type: f.type,
      x: f.x,
      z: f.z,
      rot: f.rot
    }));
    const ignore = this.moveTarget ? this.moveTarget : null;
    return validatePlacement({
      type: this.catalogType,
      x,
      z,
      rot,
      level,
      colliders,
      shelves,
      fixtures,
      ignore
    });
  }

  confirmPlace() {
    if (!this.enabled) return;
    const item = catalogItem(this.catalogType);
    if (!item) return;
    const pos = this.getWorldPositionFromPlayer();
    const res = this.validateAt(pos.x, pos.z, this.rotation);
    if (!res.ok) {
      this.game.ui.toast(res.reason || 'Cannot place here');
      return;
    }
    const cost = item.cost || 0;

    if (this.moveTarget) {
      // moving existing
      if (this.moveTarget.kind === 'fixture') {
        const fx = (this.game.runtime.fixtures || []).find((f) => f.id === this.moveTarget.id);
        if (fx) {
          fx.x = res.x;
          fx.z = res.z;
          fx.rot = res.rot;
          // rebuild visual
          if (fx.group) {
            this.game.scene.remove(fx.group);
            fx.group.traverse((o) => {
              if (o.geometry) o.geometry.dispose?.();
              if (o.material) {
                const mats = Array.isArray(o.material) ? o.material : [o.material];
                mats.forEach((m) => m.dispose?.());
              }
            });
          }
          const mesh = createFixtureMesh(fx);
          this.game.scene.add(mesh);
          fx.group = mesh;
        }
      } else if (this.moveTarget.kind === 'shelf') {
        const sh = this.game.runtime.shelves.find((s) => s.spot === this.moveTarget.id);
        if (sh) {
          sh.x = res.x;
          sh.z = res.z;
          sh.rot = res.rot;
          if (sh.group) {
            this.game.scene.remove(sh.group);
          }
          // recreate shelf mesh at new pos
          const shd = { ...sh, x: sh.x, z: sh.z, rot: sh.rot };
          const group = createShelfMesh(shd, this.game);
          sh.group = group;
        }
      }
      this.moveTarget = null;
      this.game.syncShelfData?.();
      this.game.save(true, true);
      this.game.ui.toast('Moved');
      this.updateGhost();
      return;
    }

    // Placing new: validate the product and destination before spending money.
    const shelfType = isShelfType(this.catalogType);
    let shelfSpot = -1;
    if (shelfType) {
      if (!productAllowed(this.game, this.productId)) {
        this.game.ui.toast('That product is not licensed');
        return;
      }
      if (this.game.state.shelves.length >= maxSpots(this.game.state.level || 1)) {
        this.game.ui.toast('Expand your store first');
        return;
      }
      shelfSpot = nextFreeSpot(this.game.state.level || 1, this.game.runtime.shelves);
      if (shelfSpot < 0) {
        this.game.ui.toast('No free shelf spots');
        return;
      }
    }
    if (cost > 0 && this.game.state.cash < cost) {
      this.game.ui.toast('Not enough cash');
      return;
    }
    if (cost > 0) {
      this.game.state.cash = rounded(this.game.state.cash - cost);
      if (!this.game.runtime.stats)
        this.game.runtime.stats = {
          revenue: 0,
          stockCost: 0,
          happy: 0,
          angry: 0,
          recycle: 0,
          buildCost: 0
        };
      this.game.runtime.stats.buildCost = (this.game.runtime.stats.buildCost || 0) + cost;
    }

    if (shelfType) {
      const fridge = !!item.fridge;
      const freezer = !!item.freezer;
      const shd = shelfDataFromSpot(shelfSpot, this.productId, { fridge, freezer });
      shd.x = res.x;
      shd.z = res.z;
      shd.rot = res.rot;
      this.game.state.shelves.push({ ...shd });
      const group = createShelfMesh(shd, this.game);
      this.game.runtime.shelves.push({ ...shd, group });
      this.game.world.rebuildColliders?.();
    } else {
      // fixture
      const id = `${this.catalogType}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const fx = { id, type: this.catalogType, x: res.x, z: res.z, rot: res.rot };
      if (!this.game.state.fixtures) this.game.state.fixtures = [];
      this.game.state.fixtures.push({ ...fx });
      if (!this.game.runtime.fixtures) this.game.runtime.fixtures = [];
      const mesh = createFixtureMesh(fx);
      this.game.scene.add(mesh);
      this.game.runtime.fixtures.push({ ...fx, group: mesh });
      this.game.world.rebuildColliders?.();
    }

    this.game.ui.updateHUD?.();
    this.game.save(true, true);
    this.game.ui.toast('Placed');
    this.updateGhost();
  }

  cancel() {
    this.moveTarget = null;
    this.game.ui.toast('Cancelled');
    this.updateGhost();
  }

  removeAtLook() {
    // simple: try to find nearest fixture/shelf in front
    const pos = this.getWorldPositionFromPlayer();
    const fxList = this.game.runtime.fixtures || [];
    for (const fx of fxList) {
      const dx = fx.x - pos.x;
      const dz = fx.z - pos.z;
      if (Math.hypot(dx, dz) < 1.5) {
        // remove
        const item = catalogItem(fx.type);
        const refund = Math.floor((item?.cost || 0) * 0.5);
        this.game.state.cash += refund;
        this.game.state.fixtures = (this.game.state.fixtures || []).filter((f) => f.id !== fx.id);
        this.game.runtime.fixtures = fxList.filter((f) => f !== fx);
        if (fx.group) {
          this.game.scene.remove(fx.group);
        }
        this.game.world.rebuildColliders?.();
        this.game.save(true, true);
        this.game.ui.toast(`Removed (+$${refund})`);
        return;
      }
    }
    this.game.ui.toast('Nothing to remove nearby');
  }

  update() {
    if (!this.enabled) return;
    this.updateGhost();
  }
}
