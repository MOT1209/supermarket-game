import {
  REPUTATION_MAX, REPUTATION_START, HAPPY_REP_GAIN, ANGRY_REP_LOSS,
  SPAWN_BASE_RATE
} from '../data/products.js';

export function adjustReputation(game, delta) {
  const cur = Number.isFinite(game.state.reputation)
    ? game.state.reputation
    : REPUTATION_START;
  game.state.reputation = Math.max(0, Math.min(REPUTATION_MAX, cur + delta));
}

export function onHappyCustomer(game) { adjustReputation(game, HAPPY_REP_GAIN); }
export function onAngryCustomer(game) { adjustReputation(game, -ANGRY_REP_LOSS); }

// Reputation scales how often new customers arrive: 0 -> 0.5x, 5 -> 1.5x.
export function spawnRate(game) {
  const rep = Number.isFinite(game.state.reputation)
    ? game.state.reputation
    : REPUTATION_START;
  return SPAWN_BASE_RATE * (0.5 + rep / REPUTATION_MAX);
}

// 0..1 fill used by the HUD star meter.
export function reputationRatio(game) {
  const rep = Number.isFinite(game.state.reputation)
    ? game.state.reputation
    : REPUTATION_START;
  return rep / REPUTATION_MAX;
}
