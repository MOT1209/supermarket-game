// Procedural Web Audio sound effects — no audio files required.
export default class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.volume = 0.8;
  }

  init() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      try { this.ctx = new Ctx(); } catch (e) { return; }
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this.volume;
  }

  tone(freq, dur, type = 'sine', vol = 0.12, delay = 0) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain); gain.connect(this.master);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  play(name) {
    switch (name) {
      case 'beep':    this.tone(880, 0.08, 'square', 0.06); break;
      case 'scan':    this.tone(1200, 0.05, 'sine', 0.08); break;
      case 'success': this.tone(660, 0.10); this.tone(880, 0.12, 'sine', 0.1, 0.09); this.tone(1100, 0.16, 'sine', 0.1, 0.18); break;
      case 'error':   this.tone(180, 0.25, 'sawtooth', 0.12); this.tone(130, 0.30, 'sawtooth', 0.1, 0.10); break;
      case 'pick':    this.tone(320, 0.07, 'triangle', 0.09); break;
      case 'place':   this.tone(240, 0.09, 'triangle', 0.09); break;
      case 'coin':    this.tone(1500, 0.05, 'square', 0.05); this.tone(2000, 0.05, 'square', 0.04, 0.05); break;
      case 'cash':    this.tone(520, 0.06, 'square', 0.06); this.tone(780, 0.08, 'square', 0.05, 0.06); break;
      case 'delivery':this.tone(300, 0.15, 'sine', 0.1); this.tone(400, 0.20, 'sine', 0.1, 0.14); break;
      default: break;
    }
  }
}
