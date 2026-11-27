import {
  clampPitch,
  describeLockError,
  isEditableTarget,
  isSprinting,
  normalizeKey,
  readAxes
} from './controls.js';
import TouchControls from '../ui/TouchControls.js';

const MOVEMENT_KEYS = new Set([
  'w',
  'a',
  's',
  'd',
  'arrowup',
  'arrowdown',
  'arrowleft',
  'arrowright'
]);
const ACTION_KEYS = new Set(['e', 'q', 'l', 'b', 'm', 'r', 'x']);

export default class Input {
  constructor(game) {
    this.game = game;
    this.keys = Object.create(null);
    this.locked = document.pointerLockElement === game.renderer.domElement;
    this.lastUnlockAt = 0;
    this.touch = new TouchControls(game, this);
    this.attach();
  }

  get wantsPointerLock() {
    return !this.touch.enabled;
  }

  attach() {
    addEventListener('keydown', (e) => this.onKeyDown(e));
    addEventListener('keyup', (e) => this.onKeyUp(e));
    addEventListener('blur', () => this.onFocusLost());
    addEventListener('focus', () => this.clearKeys());
    addEventListener('pagehide', () => this.onFocusLost());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.onFocusLost();
    });
    addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('pointerlockchange', () => this.onLockChange());
    document.addEventListener('pointerlockerror', () => {
      this.onLockError({ name: 'NotAllowedError' });
    });

    // A canvas click is a natural retry point after a denied lock request.
    this.game.renderer.domElement.addEventListener('click', () => {
      if (this.game.mode === 'playing' && !this.locked && this.wantsPointerLock) this.requestLock();
    });
  }

  onKeyDown(e) {
    const k = normalizeKey(e.key);

    // Escape must work even while an input is focused (terminal/checkout).
    if (k === 'escape') {
      e.preventDefault();
      this.game.onEscape();
      return;
    }

    if (isEditableTarget(e.target)) return;

    // Shift is a held modifier, so it must be tracked like a movement key.
    if (k === 'shift') {
      if (this.game.mode !== 'playing') return;
      e.preventDefault();
      this.keys.shift = true;
      return;
    }

    if (MOVEMENT_KEYS.has(k)) {
      if (this.game.mode !== 'playing') return;
      e.preventDefault();
      this.keys[k] = true;
      return;
    }

    if (e.repeat || this.game.mode !== 'playing') return;
    if (!ACTION_KEYS.has(k)) return;
    if (k === 'e') {
      if (this.game.buildSystem?.enabled) this.game.buildSystem.confirmPlace();
      else this.game.onInteract();
    } else if (k === 'q') this.game.onDrop();
    else if (k === 'l' && this.wantsPointerLock && !this.locked) this.requestLock();
    else if (k === 'b') this.game.buildSystem?.toggle();
    else if (k === 'r') { if (this.game.buildSystem?.enabled) this.game.buildSystem.rotate(); }
    else if (k === 'x') { if (this.game.buildSystem?.enabled) this.game.buildSystem.cancel(); }
    else if (k === 'm') this.game.ui?.toggleCityUI?.();
  }

  onKeyUp(e) {
    delete this.keys[normalizeKey(e.key)];
  }

  onFocusLost() {
    this.clearKeys();
    if (this.game.mode === 'playing') this.game.pauseGame();
  }

  clearKeys() {
    this.keys = Object.create(null);
    this.touch.reset();
  }

  getMoveAxes() {
    return readAxes(this.keys, this.touch.axes);
  }

  isSprinting() {
    return isSprinting(this.keys, this.touch.sprint);
  }

  onMouseMove(e) {
    if (!this.locked || !this.wantsPointerLock || this.game.mode !== 'playing') return;
    this.applyLook(e.movementX || 0, e.movementY || 0);
  }

  applyLook(dx, dy, scale = 1) {
    if (this.game.mode !== 'playing') return;
    const p = this.game.player;
    const sensitivity = this.game.state.sensitivity * scale;
    p.yaw -= dx * sensitivity;
    p.pitch = clampPitch(p.pitch - dy * sensitivity);
  }

  onLockChange() {
    const locked = document.pointerLockElement === this.game.renderer.domElement;
    this.locked = locked;

    if (locked) {
      this.game.ui.hideLockError();
      this.game.audio.init();
      return;
    }

    this.lastUnlockAt = performance.now();
    this.clearKeys();
    // Losing the mouse while playing means the player left the game window or
    // pressed Esc. Pause explicitly so the game can never sit in a half-locked
    // "playing" state with stale input.
    if (this.game.mode === 'playing' && this.wantsPointerLock) this.game.pauseGame();
  }

  onLockError(error) {
    this.locked = false;
    console.warn('[Input] Pointer lock failed:', error);
    this.game.ui.showLockError(describeLockError(error));
  }

  requestLock() {
    if (!this.wantsPointerLock || this.game.mode !== 'playing') {
      if (!this.wantsPointerLock) this.game.ui.hideLockError();
      return false;
    }
    const el = this.game.renderer.domElement;
    if (!el.requestPointerLock) {
      this.onLockError({ name: 'NotFoundError' });
      return false;
    }
    try {
      const result = el.requestPointerLock();
      if (result && typeof result.catch === 'function')
        result.catch((err) => this.onLockError(err));
      return true;
    } catch (err) {
      this.onLockError(err);
      return false;
    }
  }

  exitLock() {
    if (document.pointerLockElement === this.game.renderer.domElement) document.exitPointerLock();
  }

  justUnlocked() {
    return performance.now() - this.lastUnlockAt < 300;
  }

  isDown(...keys) {
    return keys.some((k) => this.keys[normalizeKey(k)]);
  }
}
