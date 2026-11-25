import * as THREE from 'three';
import {
  SHELF_SPOTS, DAY_SECONDS, PRODUCTS, WAGE_RESTOCKER, WAGE_CASHIER
} from '../data/products.js';
import { clamp, rounded } from '../utils/math.js';
import { loadGame, saveGame, defaultState, deleteSave } from './SaveSystem.js';
import AudioManager from './Audio.js';
import Input from './Input.js';
import Lighting from '../world/Lighting.js';
import StoreWorld from '../world/StoreWorld.js';
import { createShelfMesh, refreshShelfVisual, preloadProductModels } from '../world/ShelfFactory.js';
import Player from '../entities/Player.js';
import { spawnCustomer, updateCustomers, clearCustomers } from '../entities/Customer.js';
import { updateStaff, resetStaffTimers } from '../entities/Staff.js';
import UIManager from '../ui/UIManager.js';
import CheckoutSystem from '../systems/CheckoutSystem.js';
import { findInteract, interact, updatePrompt } from '../systems/Interaction.js';
import { spawnDelivery } from '../systems/DeliverySystem.js';
import { fluctuatePrices, wages, operatingCost } from '../systems/EconomySystem.js';
import { spawnRate } from '../systems/Reputation.js';
import { evaluateObjective } from '../systems/Objectives.js';

export default class Game {
  constructor() {
    this.mode = 'start';
    this.toastTimer = 0;
    this.lastTime = performance.now();
    this.lastAutosave = 0;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    document.getElementById('app').appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 200);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);

    this.state = loadGame() || defaultState();
    this.runtime = {
      elapsed: this.state.clock || 0,
      stats: { revenue: 0, stockCost: 0, happy: 0, angry: 0, recycle: 0 },
      shelves: [], boxes: [], customers: [],
      carried: null, checkoutCustomer: null
    };

    this.audio = new AudioManager();
    this.audio.setVolume(this.state.volume ?? 0.8);
    this.lighting = new Lighting(this.scene);
    this.world = new StoreWorld(this);
    this.player = new Player(this);
    this.ui = new UIManager(this);
    this.input = new Input(this);
    this.checkout = new CheckoutSystem(this);
    this.applyGraphics();

    addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });
  }

  setMode(mode) {
    if (this.mode === mode) return;
    this.mode = mode;
    if (mode !== 'playing') this.input?.clearKeys();
    this.ui?.syncMode?.(mode);
  }

  startPlaying() {
    this.setMode('playing');
    this.ui.hideAll();
    this.input.clearKeys();
    this.lastTime = performance.now();
    if (this.input.wantsPointerLock) this.input.requestLock();
  }

  pauseGame() {
    if (this.mode !== 'playing') return;
    this.setMode('paused');
    this.input.exitLock();
    this.ui.showPauseSettings();
  }

  resumeGame() {
    if (this.mode !== 'paused') return;
    this.startPlaying();
  }

  applyGraphics() {
    const g = this.state.graphics || 'high';
    const dpr = window.devicePixelRatio || 1;
    if (g === 'low') {
      this.renderer.shadowMap.enabled = false;
      this.renderer.setPixelRatio(1);
    } else if (g === 'medium') {
      this.renderer.shadowMap.enabled = true;
      this.renderer.setPixelRatio(Math.min(dpr, 1.5));
    } else {
      this.renderer.shadowMap.enabled = true;
      this.renderer.setPixelRatio(Math.min(dpr, 2));
    }
    this.renderer.shadowMap.needsUpdate = true;
    // Materials need a nudge to notice the shadow toggle.
    this.scene.traverse(o => { if (o.isMesh && o.material) o.material.needsUpdate = true; });
  }

  spot(i) { return SHELF_SPOTS[i]; }

  boot() {
    this.world.build();
    for (const shd of this.state.shelves) {
      const group = createShelfMesh(shd, this);
      this.runtime.shelves.push({ ...shd, group });
    }
    preloadProductModels()
      .then(() => this.runtime.shelves.forEach(sh => refreshShelfVisual(sh.spot, sh.group, sh, this)))
      .catch(err => console.warn('[Game] Product GLB refresh skipped.', err));
    this.world.rebuildColliders();
    spawnDelivery(this);
    this.lastAutosave = performance.now();
    document.getElementById('loading').style.display = 'none';
    this.ui.updateHUD();
    this.ui.syncMode(this.mode);
    this.camera.position.copy(this.player.pos);
    requestAnimationFrame(t => this.animate(t));
  }

  animate(now) {
    requestAnimationFrame(t => this.animate(t));
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    if (this.mode === 'playing') {
      this.player.update(dt);
      this.updateClock(dt);
      updateCustomers(this, dt);
      updateStaff(this, dt);
      updatePrompt(this, findInteract(this));
    }

    this.world.updateBeacon(now / 1000);
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.ui.el.msg.style.opacity = 0;
    }
    this.ui.updateCarry(this.runtime.carried
      ? (this.runtime.carried.trash
        ? '♻ Carrying empty box (take to dumpster)'
        : `📦 Carrying ${PRODUCTS[this.runtime.carried.productId].name} box (${this.runtime.carried.qty})`)
      : '');
    if (this.mode === 'playing' && now - this.lastAutosave > 20000) {
      this.lastAutosave = now;
      this.save(false);
    }
    this.renderer.render(this.scene, this.camera);
  }

  updateClock(dt) {
    this.runtime.elapsed += dt;
    this.state.clock = this.runtime.elapsed;
    const t = clamp(this.runtime.elapsed / DAY_SECONDS, 0, 1);
    const minutes = 8 * 60 + t * 13 * 60;
    const h = Math.floor(minutes / 60), m = Math.floor(minutes % 60);
    const ap = h >= 12 ? 'PM' : 'AM';
    const hh = h % 12 || 12;
    this.ui.updateClock(`${hh}:${String(m).padStart(2, '0')} ${ap}`, this.state.day);
    this.lighting.update(t);
    if (t >= 1) this.closeStore();
    else if (Math.random() < dt * spawnRate(this)) spawnCustomer(this);
  }

  onInteract() { interact(this); }

  onDrop() {
    const box = this.runtime.carried;
    if (!box) return;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    box.group.position.set(
      this.player.pos.x + forward.x * 1.2,
      0,
      this.player.pos.z + forward.z * 1.2
    );
    box.group.rotation.set(0, this.player.yaw, 0);
    this.world.interactables.push(box.group);
    this.runtime.carried = null;
    this.audio.play('place');
    this.ui.toast('Box dropped');
  }

  onEscape() {
    if (this.ui.el.terminalOverlay.classList.contains('show')) {
      this.ui.closeTerminal();
    } else if (this.mode === 'playing') {
      this.pauseGame();
    } else if (this.mode === 'paused' && !this.input.justUnlocked()) {
      // Escape can resume, but ignore the same keypress that the browser used
      // to release pointer lock (it arrives as an unlock first on some browsers).
      this.resumeGame();
    }
  }

  syncShelfData() {
    this.state.shelves = this.state.shelves.map(d => ({ ...d }));
    this.runtime.shelves.forEach(sh => {
      const d = this.state.shelves.find(x => x.spot === sh.spot);
      if (d) d.stock = sh.stock;
    });
  }

  save(showToast = false) {
    if (saveGame(this.state) && showToast) this.ui.toast('💾 Game saved');
  }

  newGame() {
    deleteSave();
    location.reload();
  }

  closeStore() {
    if (this.mode === 'summary') return;
    this.setMode('summary');
    this.input.exitLock();
    const wage = wages(this);
    const upkeep = operatingCost(this);
    const st = this.runtime.stats;
    const { obj, progress, met, bonus } = evaluateObjective(this);
    this.state.cash = rounded(this.state.cash - wage - upkeep + bonus);
    const net = rounded(st.revenue + st.recycle + bonus - st.stockCost - wage - upkeep);
    if (this.state.cash < WAGE_RESTOCKER) this.state.staff.restocker = false;
    if (this.state.cash < WAGE_CASHIER) this.state.staff.cashier = false;
    this.ui.summary.render({
      day: this.state.day,
      revenue: st.revenue,
      stockCost: st.stockCost,
      wages: wage,
      upkeep,
      recycle: st.recycle,
      bonus,
      objective: { text: obj.text, progress, target: obj.target, met },
      net,
      happy: st.happy,
      angry: st.angry,
      cash: this.state.cash
    });
    this.save(false);
  }

  nextDay() {
    this.state.day++;
    this.runtime.elapsed = 0;
    this.state.clock = 0;
    this.runtime.stats = { revenue: 0, stockCost: 0, happy: 0, angry: 0, recycle: 0 };
    clearCustomers(this);
    resetStaffTimers();
    fluctuatePrices(this);
    this.startPlaying();
    spawnDelivery(this);
    this.ui.updateHUD();
    this.save(false);
    this.ui.toast(`Day ${this.state.day} begins — new prices & delivery!`);
  }
}
