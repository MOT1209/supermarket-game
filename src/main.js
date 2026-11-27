import './style.css';
import Game from './core/Game.js';
import { WebGLGuard, webglMessage, WEBGL_UNAVAILABLE } from './core/WebGLGuard.js';

const fatalOverlay = document.getElementById('fatalOverlay');
const fatalMsg = document.getElementById('fatalMsg');
const loading = document.getElementById('loading');

function showFatal(message) {
  fatalMsg.textContent = message;
  fatalOverlay.classList.add('show');
  if (loading) loading.style.display = 'none';
}

function hideFatal() {
  fatalOverlay.classList.remove('show');
}

document.getElementById('fatalReload').addEventListener('click', () => location.reload());

let game = null;
const guard = new WebGLGuard({
  onUnavailable: showFatal,
  onLost: (message) => {
    if (game) game.pauseGame();
    showFatal(message);
  },
  onRestored: () => {
    hideFatal();
    if (game) game.resumeAfterContextRestore();
  }
});

// Probe before Three.js allocates a renderer, so unsupported devices get a
// readable explanation instead of a blank canvas and a console exception.
if (guard.check()) {
  try {
    game = new Game(guard);
    game.boot();
  } catch (err) {
    console.error('[Game] failed to start', err);
    showFatal(webglMessage(WEBGL_UNAVAILABLE, err?.message || String(err)));
  }
}

// Exposed for debugging in development consoles and for automated E2E checks
// (append ?e2e=1 to the URL in a production build).
if ((import.meta.env && import.meta.env.DEV) || location.search.includes('e2e=1')) {
  window.freshMart = game;
}
