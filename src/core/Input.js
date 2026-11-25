import { clamp } from '../utils/math.js';

export default class Input {
  constructor(game) {
    this.game = game;
    this.keys = {};
    this.attach();
  }

  attach() {
    addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      this.keys[k] = true;
      if (k === 'escape') this.game.onEscape();
      if (k === 'e' && this.game.mode === 'playing') this.game.onInteract();
      if (k === 'q' && this.game.mode === 'playing') this.game.onDrop();
    });
    addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });
    addEventListener('blur', () => { this.keys = {}; });
    addEventListener('mousemove', e => {
      if (document.pointerLockElement !== this.game.renderer.domElement || this.game.mode !== 'playing') return;
      const p = this.game.player;
      p.yaw -= e.movementX * this.game.state.sensitivity;
      p.pitch -= e.movementY * this.game.state.sensitivity;
      p.pitch = clamp(p.pitch, -1.4, 1.4);
    });
    document.addEventListener('pointerlockchange', () => this.onLockChange());
  }

  onLockChange() {
    const locked = document.pointerLockElement === this.game.renderer.domElement;
    if (locked) {
      if (this.game.mode === 'paused') {
        this.game.mode = 'playing';
        this.game.ui.hide('pause');
      }
      this.game.audio.init();
    } else if (this.game.mode === 'playing') {
      this.game.mode = 'paused';
      this.game.ui.showPauseSettings();
    }
  }

  requestLock() {
    if (this.game.mode !== 'playing') return;
    const el = this.game.renderer.domElement;
    if (el.requestPointerLock) {
      const r = el.requestPointerLock();
      if (r && typeof r.catch === 'function') r.catch(() => {});
    }
  }

  exitLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  isDown(...keys) { return keys.some(k => this.keys[k]); }
}
