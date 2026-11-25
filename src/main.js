import './style.css';
import Game from './core/Game.js';

const game = new Game();
game.boot();

// Exposed for debugging in development consoles.
if (import.meta.env && import.meta.env.DEV) window.freshMart = game;
