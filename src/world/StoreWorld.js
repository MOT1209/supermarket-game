import * as THREE from 'three';
import { floorTexture, outsideTexture, signTexture, makeCanvas } from '../utils/textures.js';
import { cloneModel } from '../utils/AssetLoader.js';
import {
  shelfRect,
  storeFloors,
  insideStore as buildInsideStore,
  unlockedExpansions,
  expansionDoorway,
  WALL_HEIGHT
} from '../data/build.js';
import { disposeObject3D } from '../utils/dispose.js';

const boxMesh = (w, h, d, color, opts = {}) => {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...opts })
  );
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};

export default class StoreWorld {
  constructor(game) {
    this.game = game;
    this.interactables = [];
    this.colliders = [];
    this.structure = null;
    this.walls = [];
    this.structureLevel = 0;
  }

  tagInteract(obj, type, prompt) {
    obj.userData.interact = { type, prompt };
    this.interactables.push(obj);
  }

  build() {
    const { scene, state } = this.game;

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 24),
      new THREE.MeshStandardMaterial({ map: floorTexture() })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const yard = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 5.4),
      new THREE.MeshStandardMaterial({ map: outsideTexture() })
    );
    yard.rotation.x = -Math.PI / 2;
    yard.position.set(0, -0.02, 16.4);
    yard.receiveShadow = true;
    scene.add(yard);

    // Procedural structure is kept as a fallback until the GLB is ready.
    this.shell = new THREE.Group();
    scene.add(this.shell);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0xe8efe6, roughness: 0.9 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x86c7de,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0.1
    });
    const wall = (x, z, w, d, h, mat = wallMat) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, h / 2, z);
      m.castShadow = true;
      m.receiveShadow = true;
      this.shell.add(m);
      return m;
    };
    // The back and side walls (with expansion doorways) come from
    // rebuildStructure(); the shell keeps the front facade as a fallback.
    wall(-7.25, 12, 9.5, 0.5, 5);
    wall(7.25, 12, 9.5, 0.5, 5);
    wall(0, 12, 5, 0.5, 1.2);
    const g1 = new THREE.Mesh(new THREE.BoxGeometry(9.2, 2.2, 0.1), glassMat);
    g1.position.set(-7.25, 3, 12);
    this.shell.add(g1);
    const g2 = g1.clone();
    g2.position.x = 7.25;
    this.shell.add(g2);

    const ceil = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 24),
      new THREE.MeshBasicMaterial({ color: 0xe9eee8, side: THREE.DoubleSide })
    );
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 5;
    this.shell.add(ceil);

    // --- Decor: welcome mat, plants and aisle signs ---
    const mat = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 1.6),
      new THREE.MeshStandardMaterial({
        map: makeCanvas(
          (x, w, h) => {
            x.fillStyle = '#1d5130';
            x.fillRect(0, 0, w, h);
            x.strokeStyle = '#8fd6a2';
            x.lineWidth = 8;
            x.strokeRect(12, 12, w - 24, h - 24);
            x.fillStyle = '#eafbe9';
            x.font = 'bold 52px Arial';
            x.textAlign = 'center';
            x.fillText('WELCOME', w / 2, h / 2 + 18);
          },
          512,
          256
        ),
        roughness: 1
      })
    );
    mat.rotation.x = -Math.PI / 2;
    mat.position.set(0, 0.02, 10.8);
    scene.add(mat);

    const potMat = new THREE.MeshStandardMaterial({ color: 0xa9613c, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f8a4a, roughness: 0.85 });
    for (const [px, pz] of [
      [-10, -9],
      [10, -9],
      [-10, 3],
      [10, 3]
    ]) {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.5, 10), potMat);
      pot.position.set(px, 0.25, pz);
      pot.castShadow = true;
      scene.add(pot);
      for (const [ox, oy, oz, s] of [
        [0, 0.75, 0, 0.42],
        [-0.2, 0.62, 0.1, 0.3],
        [0.2, 0.66, -0.1, 0.32]
      ]) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), leafMat);
        leaf.position.set(px + ox, oy, pz + oz);
        leaf.castShadow = true;
        scene.add(leaf);
      }
    }

    const aisleSign = (text, x) => {
      const s = new THREE.Mesh(
        new THREE.PlaneGeometry(2.2, 0.55),
        new THREE.MeshBasicMaterial({
          map: makeCanvas(
            (cx, w, h) => {
              cx.fillStyle = '#143b25';
              cx.fillRect(0, 0, w, h);
              cx.strokeStyle = '#ffd76b';
              cx.lineWidth = 6;
              cx.strokeRect(8, 8, w - 16, h - 16);
              cx.fillStyle = '#fff5d6';
              cx.font = 'bold 44px Arial';
              cx.textAlign = 'center';
              cx.fillText(text, w / 2, h / 2 + 16);
            },
            512,
            128
          ),
          side: THREE.DoubleSide
        })
      );
      s.position.set(x, 3.6, -2);
      scene.add(s);
    };
    aisleSign('AISLE 1', -5);
    aisleSign('AISLE 2', 3);

    // Delivery pallet outside
    const pallet = new THREE.Mesh(
      new THREE.BoxGeometry(6, 0.12, 2.4),
      new THREE.MeshStandardMaterial({ color: 0x8b6a42, roughness: 0.95 })
    );
    pallet.position.set(0, 0.04, 16.6);
    pallet.receiveShadow = true;
    scene.add(pallet);

    // Sign above the entrance
    this.sign = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 1.75),
      new THREE.MeshBasicMaterial({ map: signTexture(state.storeName) })
    );
    this.sign.position.set(0, 3.5, 12.35);
    scene.add(this.sign);

    // Register
    const reg = new THREE.Group();
    const counter = boxMesh(2.6, 1, 1.1, 0x356b45);
    counter.position.y = 0.5;
    reg.add(counter);
    const top = boxMesh(2.8, 0.12, 1.2, 0x224d31);
    top.position.y = 1.06;
    reg.add(top);
    const screen = boxMesh(0.7, 0.5, 0.5, 0x222a26);
    screen.position.set(-0.6, 1.4, 0);
    reg.add(screen);
    const scan = boxMesh(0.5, 0.08, 0.35, 0xcc2222, { emissive: 0x661111 });
    scan.position.set(0.5, 1.16, 0);
    reg.add(scan);
    reg.position.set(7, 0, 8);
    scene.add(reg);
    this.tagInteract(reg, 'register', 'Register — check out customer');
    this.register = reg;
    this.cashierSpot = new THREE.Vector3(7, 0, 6.2);

    // Store terminal
    const term = new THREE.Group();
    const base = boxMesh(1.2, 1.1, 0.8, 0x3a4450);
    base.position.y = 0.55;
    term.add(base);
    const sc = boxMesh(1.05, 0.7, 0.08, 0x0c2a1a, { emissive: 0x0a3a20 });
    sc.position.set(0, 1.35, -0.32);
    sc.rotation.x = -0.25;
    term.add(sc);
    term.position.set(-7, 0, 8);
    term.rotation.y = Math.PI;
    scene.add(term);
    this.tagInteract(term, 'terminal', 'Store Terminal — manage your store');
    this.terminal = term;

    // Delivery marker + beacon
    const zone = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 5),
      new THREE.MeshBasicMaterial({
        color: 0x2b7a3d,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide
      })
    );
    zone.rotation.x = -Math.PI / 2;
    zone.position.set(0, 0.01, 16.4);
    scene.add(zone);
    const beacon = new THREE.Group();
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 1.2, 4),
      new THREE.MeshBasicMaterial({ color: 0x7dff9a, transparent: true, opacity: 0.85 })
    );
    cone.rotation.x = Math.PI;
    beacon.add(cone);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.08, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0x9dffb0 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.9;
    beacon.add(ring);
    beacon.position.set(0, 3.4, 16.4);
    beacon.visible = false;
    scene.add(beacon);
    this.beacon = beacon;
    this.beaconLight = new THREE.PointLight(0x7dff9a, 0, 12);
    this.beaconLight.position.set(0, 3, 16.4);
    scene.add(this.beaconLight);

    // Dumpster
    const dump = new THREE.Group();
    const bin = boxMesh(2.2, 1.2, 1.4, 0x2f6b40);
    bin.position.y = 0.6;
    dump.add(bin);
    const lid = boxMesh(2.4, 0.12, 1.5, 0x224d31, { metalness: 0.3 });
    lid.position.y = 1.28;
    dump.add(lid);
    dump.position.set(-10, 0, 16);
    scene.add(dump);
    this.tagInteract(dump, 'dumpster', 'Dumpster — dispose of trash boxes');
    this.dumpster = dump;

    this.rebuildStructure();
    this.addBlenderProps();
  }

  // Blender GLBs enhance the procedural world. Failures are non-fatal: the
  // original meshes remain and gameplay is unaffected.
  async addBlenderProps() {
    const placements = [
      ['store_shell.glb', [0, 0, 0], 0],
      ['display_stand.glb', [-9.2, 0, 5.5], Math.PI / 2],
      ['display_stand.glb', [9.6, 0, 2.5], -Math.PI / 2],
      ['checkout_counter.glb', null, 0],
      ['cashier.glb', [7, 0, 6.2], Math.PI],
      ['customer_1.glb', [2.5, 0, 10], Math.PI],
      ['customer_2.glb', [-3.5, 0, 9.5], 0.4],
      ['customer_3.glb', [4.5, 0, 10.2], -0.6]
    ];
    for (const [file, pos, rotation] of placements) {
      const model = await cloneModel(file);
      if (!model) continue;
      model.rotation.y = rotation;
      if (file === 'store_shell.glb') {
        // Keep the textured procedural floor and generated walls; hide the
        // duplicated GLB parts so doorways line up with the structure.
        model.traverse((mesh) => {
          if (!mesh.isMesh) return;
          if (['floor_slab', 'wall_back', 'wall_left', 'wall_right'].includes(mesh.name)) {
            mesh.visible = false;
          }
        });
        if (this.shell) this.shell.visible = false;
        this.rebuildStructure();
      }
      if (file === 'checkout_counter.glb' && this.register) {
        this.register.clear();
        this.register.add(model);
      } else if (pos) {
        model.position.set(pos[0], pos[1], pos[2]);
        this.game.scene.add(model);
      }
    }
  }

  // Rebuild the wall geometry and the collider set for the current level.
  rebuildStructure() {
    if (!this.game?.scene) return;
    if (!this.structure) {
      this.structure = new THREE.Group();
      this.structure.name = 'store_structure';
      this.game.scene.add(this.structure);
    }
    const level = Math.max(1, Math.floor(Number(this.game.state?.level) || 1));
    if (this.structureLevel === level) {
      this.rebuildColliders();
      return;
    }
    this.structureLevel = level;

    const old = [...this.structure.children];
    for (const child of old) {
      this.structure.remove(child);
      disposeObject3D(child);
    }

    this.walls = this.structureWalls(level);
    for (const w of this.walls) this.addWall(w);
    for (const rect of storeFloors(level).slice(1)) this.addRoomSurfaces(rect);
    this.rebuildColliders();
  }

  // Walls are built once per boundary: the base floor owns its back/left/right
  // walls and each expansion owns its three outer walls. A doorway is cut
  // wherever a later expansion touches an existing wall.
  structureWalls(level) {
    const walls = [
      { axis: 'x', at: -12, from: -12, to: 12, height: WALL_HEIGHT },
      { axis: 'z', at: -12, from: -12, to: 12, height: WALL_HEIGHT },
      { axis: 'z', at: 12, from: -12, to: 12, height: WALL_HEIGHT }
    ];
    const expansions = unlockedExpansions(level);
    for (const e of expansions) {
      const r = e.rect;
      if (e.wall === 'back') {
        walls.push(
          { axis: 'x', at: r.minZ, from: r.minX, to: r.maxX, height: WALL_HEIGHT },
          { axis: 'z', at: r.minX, from: r.minZ, to: r.maxZ, height: WALL_HEIGHT },
          { axis: 'z', at: r.maxX, from: r.minZ, to: r.maxZ, height: WALL_HEIGHT }
        );
      } else {
        walls.push(
          { axis: 'x', at: r.minZ, from: r.minX, to: r.maxX, height: WALL_HEIGHT },
          { axis: 'x', at: r.maxZ, from: r.minX, to: r.maxX, height: WALL_HEIGHT },
          {
            axis: 'z',
            at: e.wall === 'left' ? r.minX : r.maxX,
            from: r.minZ,
            to: r.maxZ,
            height: WALL_HEIGHT
          }
        );
      }
    }
    for (const e of expansions) {
      const door = expansionDoorway(e);
      if (!door) continue;
      for (const w of walls) {
        if (w.axis !== door.axis || Math.abs(w.at - door.at) > 0.01) continue;
        if (door.min < w.from - 0.01 || door.max > w.to + 0.01) continue;
        w.openings = [...(w.openings || []), { min: door.min, max: door.max, height: door.height }];
        break;
      }
    }
    return walls;
  }

  // Full-height stretches of a wall, i.e. everything beside its doorways.
  wallSegments(w) {
    const segs = [];
    let cursor = w.from;
    for (const o of [...(w.openings || [])].sort((a, b) => a.min - b.min)) {
      if (o.min > cursor + 0.01) segs.push({ from: cursor, to: o.min });
      cursor = Math.max(cursor, o.max);
    }
    if (cursor < w.to - 0.01) segs.push({ from: cursor, to: w.to });
    return segs;
  }

  addWall(w) {
    const mat = new THREE.MeshStandardMaterial({ color: 0xe8efe6, roughness: 0.9 });
    const thickness = 0.5;
    const addBox = (from, to, y0, y1) => {
      const len = to - from;
      const h = y1 - y0;
      if (len <= 0.01 || h <= 0.01) return;
      const geo =
        w.axis === 'x'
          ? new THREE.BoxGeometry(len, h, thickness)
          : new THREE.BoxGeometry(thickness, h, len);
      const mesh = new THREE.Mesh(geo, mat);
      const mid = (from + to) / 2;
      if (w.axis === 'x') mesh.position.set(mid, (y0 + y1) / 2, w.at);
      else mesh.position.set(w.at, (y0 + y1) / 2, mid);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.structure.add(mesh);
    };
    for (const s of this.wallSegments(w)) addBox(s.from, s.to, 0, w.height || WALL_HEIGHT);
    // Lintels above every doorway.
    for (const o of w.openings || []) addBox(o.min, o.max, o.height, w.height || WALL_HEIGHT);
  }

  addRoomSurfaces(rect) {
    const w = rect.maxX - rect.minX;
    const d = rect.maxZ - rect.minZ;
    const cx = (rect.minX + rect.maxX) / 2;
    const cz = (rect.minZ + rect.maxZ) / 2;
    const tex = floorTexture();
    tex.repeat.set(Math.max(1, w / 3), Math.max(1, d / 3));
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshStandardMaterial({ map: tex })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, 0.01, cz);
    floor.receiveShadow = true;
    this.structure.add(floor);
    const ceil = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshBasicMaterial({ color: 0xe9eee8, side: THREE.DoubleSide })
    );
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(cx, WALL_HEIGHT, cz);
    this.structure.add(ceil);
  }

  rebuildColliders() {
    const c = [
      // Front wall leaves the entrance open.
      { minX: -12.5, maxX: -2.5, minZ: 11.6, maxZ: 12.4 },
      { minX: 2.5, maxX: 12.5, minZ: 11.6, maxZ: 12.4 },
      // Register, terminal and dumpster.
      { minX: 5.5, maxX: 8.5, minZ: 7.2, maxZ: 8.8 },
      { minX: -7.7, maxX: -6.3, minZ: 7.4, maxZ: 8.6 },
      { minX: -11.3, maxX: -8.7, minZ: 15.2, maxZ: 16.8 }
    ];
    for (const w of this.walls) {
      for (const s of this.wallSegments(w)) {
        if (w.axis === 'x') {
          c.push({ minX: s.from, maxX: s.to, minZ: w.at - 0.25, maxZ: w.at + 0.25 });
        } else {
          c.push({ minX: w.at - 0.25, maxX: w.at + 0.25, minZ: s.from, maxZ: s.to });
        }
      }
    }
    // Add fixture colliders
    for (const fx of this.game.runtime.fixtures || []) {
      if (fx.type === 'sign' || fx.type === 'storage') continue;
      // approximate from type
      const map = { counter: [2.6, 1.0], plant: [0.8, 0.8], bench: [2.0, 0.7] };
      const sz = map[fx.type] || [1, 1];
      const w = sz[0],
        d = sz[1];
      const rot = fx.rot || 0;
      const rw = Math.abs(Math.sin(rot)) > 0.7 ? d : w;
      const rd = Math.abs(Math.sin(rot)) > 0.7 ? w : d;
      c.push({
        minX: fx.x - rw / 2,
        maxX: fx.x + rw / 2,
        minZ: fx.z - rd / 2,
        maxZ: fx.z + rd / 2
      });
    }
    for (const sh of this.game.runtime.shelves) {
      const r = shelfRect(sh);
      if (r)
        c.push({
          minX: r.minX - 0.05,
          maxX: r.maxX + 0.05,
          minZ: r.minZ - 0.05,
          maxZ: r.maxZ + 0.05
        });
    }
    this.colliders = c;
    this.storeColliders = c; // for nav
  }

  collides(x, z) {
    const r = 0.38;
    return this.colliders.some(
      (c) => x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ
    );
  }

  isInsideStore(x, z, level, padding = 0.2) {
    const lvl = level ?? this.game?.state?.level ?? 1;
    return buildInsideStore(x, z, lvl, padding);
  }

  setStoreName(name) {
    this.sign.material.map.dispose();
    this.sign.material.map = signTexture(name);
    this.sign.material.needsUpdate = true;
  }

  updateBeacon(time) {
    if (!this.beacon.visible) return;
    this.beacon.position.y = 3.4 + Math.sin(time * 2) * 0.3;
    this.beacon.rotation.y = time;
    this.beaconLight.intensity = 0.9 + Math.sin(time * 4) * 0.4;
  }
}
