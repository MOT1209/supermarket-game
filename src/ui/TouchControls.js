import { TOUCH_LOOK_SCALE } from '../core/controls.js';

const isTouchPointer = (e) => e.pointerType === 'touch' || e.pointerType === 'pen';

export default class TouchControls {
  constructor(game, input) {
    this.game = game;
    this.input = input;
    // Use touch controls on phones/tablets, but keep Pointer Lock on hybrids
    // whose primary pointer is a mouse (touch-screen laptops).
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    const fine = typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches;
    this.enabled = coarse || ((navigator.maxTouchPoints || 0) > 0 && !fine);
    this.axes = { x: 0, z: 0 };
    this.sprint = false;
    this.joyPointer = null;
    this.lookPointer = null;
    this.el = {
      root: document.getElementById('mobileControls'),
      zone: document.getElementById('joystickZone'),
      base: document.getElementById('joystickBase'),
      knob: document.getElementById('joystickKnob'),
      interact: document.getElementById('touchInteract'),
      drop: document.getElementById('touchDrop'),
      sprint: document.getElementById('touchSprint')
    };
    this.bind();
    this.setVisible(false);
  }

  bind() {
    const canvas = this.game.renderer.domElement;

    this.el.zone?.addEventListener('pointerdown', (e) => this.onJoyDown(e));
    this.el.zone?.addEventListener('pointermove', (e) => this.onJoyMove(e));
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      this.el.zone?.addEventListener(type, (e) => this.onJoyEnd(e));
    }

    canvas.addEventListener('pointerdown', (e) => this.onLookDown(e));
    canvas.addEventListener('pointermove', (e) => this.onLookMove(e));
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      canvas.addEventListener(type, (e) => this.onLookEnd(e));
    }
    canvas.addEventListener('contextmenu', (e) => {
      if (this.enabled) e.preventDefault();
    });

    this.bindButton(this.el.interact, () => this.game.onInteract());
    this.bindButton(this.el.drop, () => this.game.onDrop());
    this.bindButton(
      this.el.sprint,
      () => {},
      () => {
        this.sprint = true;
        this.el.sprint.classList.add('active');
      },
      () => {
        this.sprint = false;
        this.el.sprint.classList.remove('active');
      }
    );
  }

  bindButton(el, onPress, onDown = onPress, onUp = null) {
    if (!el) return;
    el.addEventListener('pointerdown', (e) => {
      if (!this.enabled || this.game.mode !== 'playing' || !isTouchPointer(e)) return;
      e.preventDefault();
      this.capture(el, e.pointerId);
      onDown(e);
    });
    const release = (e) => {
      if (!this.enabled) return;
      this.release(el, e.pointerId);
      if (onUp) onUp(e);
    };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      el.addEventListener(type, release);
    }
  }

  capture(el, pointerId) {
    try {
      el.setPointerCapture(pointerId);
    } catch {
      /* synthetic pointers may not be capturable */
    }
  }

  release(el, pointerId) {
    try {
      if (el.hasPointerCapture?.(pointerId)) el.releasePointerCapture(pointerId);
    } catch {
      /* no-op */
    }
  }

  onJoyDown(e) {
    if (!this.enabled || this.game.mode !== 'playing' || !isTouchPointer(e)) return;
    e.preventDefault();
    this.joyPointer = e.pointerId;
    this.capture(this.el.zone, e.pointerId);
    this.updateJoy(e);
  }

  onJoyMove(e) {
    if (this.joyPointer !== e.pointerId || this.game.mode !== 'playing') return;
    e.preventDefault();
    this.updateJoy(e);
  }

  updateJoy(e) {
    const r = this.el.base.getBoundingClientRect();
    const radius = Math.max(1, r.width / 2);
    let x = (e.clientX - (r.left + radius)) / radius;
    let z = (e.clientY - (r.top + radius)) / radius;
    const length = Math.hypot(x, z);
    if (length > 1) {
      x /= length;
      z /= length;
    }
    this.axes.x = x;
    this.axes.z = z;
    if (this.el.knob) {
      this.el.knob.style.transform = `translate(calc(-50% + ${x * radius * 0.5}px), calc(-50% + ${z * radius * 0.5}px))`;
    }
  }

  onJoyEnd(e) {
    if (this.joyPointer !== e.pointerId) return;
    this.release(this.el.zone, e.pointerId);
    this.joyPointer = null;
    this.axes.x = 0;
    this.axes.z = 0;
    if (this.el.knob) this.el.knob.style.transform = 'translate(-50%, -50%)';
  }

  onLookDown(e) {
    if (!this.enabled || this.game.mode !== 'playing' || !isTouchPointer(e)) return;
    e.preventDefault();
    this.lookPointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
    this.capture(this.game.renderer.domElement, e.pointerId);
  }

  onLookMove(e) {
    if (!this.lookPointer || e.pointerId !== this.lookPointer.id || this.game.mode !== 'playing')
      return;
    e.preventDefault();
    const dx = e.clientX - this.lookPointer.x;
    const dy = e.clientY - this.lookPointer.y;
    this.lookPointer.x = e.clientX;
    this.lookPointer.y = e.clientY;
    this.input.applyLook(dx, dy, TOUCH_LOOK_SCALE);
  }

  onLookEnd(e) {
    if (!this.lookPointer || e.pointerId !== this.lookPointer.id) return;
    this.release(this.game.renderer.domElement, e.pointerId);
    this.lookPointer = null;
  }

  setVisible(visible) {
    const active = this.enabled && visible;
    this.el.root?.classList.toggle('active', active);
    this.el.root?.setAttribute('aria-hidden', String(!active));
    if (!visible) this.reset();
  }

  reset() {
    this.axes.x = 0;
    this.axes.z = 0;
    this.sprint = false;
    this.joyPointer = null;
    this.lookPointer = null;
    if (this.el.knob) this.el.knob.style.transform = 'translate(-50%, -50%)';
    this.el.sprint?.classList.remove('active');
  }
}
