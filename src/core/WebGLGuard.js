export const WEBGL_READY = 'ready';
export const WEBGL_LOST = 'lost';
export const WEBGL_UNAVAILABLE = 'unavailable';

const MESSAGES = {
  [WEBGL_UNAVAILABLE]:
    '3D graphics (WebGL) could not start in this browser. Enable hardware acceleration or try another browser, then reload the page.',
  [WEBGL_LOST]:
    'The graphics context was lost. The store is paused while your device recovers. When graphics are ready again this message closes and you can press Resume.'
};

export function webglMessage(kind, detail) {
  const base = MESSAGES[kind] || MESSAGES[WEBGL_UNAVAILABLE];
  return detail ? `${base} (${detail})` : base;
}

// Small enough to run before the heavy Three.js renderer is constructed.
export function defaultProbe() {
  try {
    if (typeof document === 'undefined' || !document.createElement) return false;
    const canvas = document.createElement('canvas');
    return Boolean(
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    );
  } catch {
    return false;
  }
}

export class WebGLGuard {
  constructor({
    probe = defaultProbe,
    onUnavailable = () => {},
    onLost = () => {},
    onRestored = () => {}
  } = {}) {
    this.probe = probe;
    this.onUnavailable = onUnavailable;
    this.onLost = onLost;
    this.onRestored = onRestored;
    this.status = WEBGL_READY;
  }

  check() {
    if (this.probe()) {
      this.status = WEBGL_READY;
      return true;
    }
    this.status = WEBGL_UNAVAILABLE;
    this.onUnavailable(webglMessage(WEBGL_UNAVAILABLE));
    return false;
  }

  lost(event) {
    this.status = WEBGL_LOST;
    // Lets the browser know we intend to restore the context.
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    this.onLost(webglMessage(WEBGL_LOST));
  }

  restored() {
    this.status = WEBGL_READY;
    this.onRestored();
  }
}
