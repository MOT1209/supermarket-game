import { PRODUCTS, sellPrice, DEFAULT_MARKUP } from '../data/products.js';

// The shelf price the player sets in the terminal, with a safe fallback for
// older saves / unknown products.
export function currentSellPrice(game, pid) {
  const p = game?.state?.sellPrices?.[pid];
  return Number.isFinite(p) ? p : sellPrice(pid);
}

export function margin(game, pid) {
  const cost = game?.state?.prices?.[pid] ?? PRODUCTS[pid].price;
  return Math.round((currentSellPrice(game, pid) - cost) * 100) / 100;
}

export function marginPct(game, pid) {
  const cost = game?.state?.prices?.[pid] ?? PRODUCTS[pid].price;
  if (cost <= 0) return 0;
  return Math.round((margin(game, pid) / cost) * 100);
}

// Clamp so the player can never sell below the current wholesale cost.
export function clampSellPrice(game, pid, value) {
  const cost = game?.state?.prices?.[pid] ?? PRODUCTS[pid].price;
  const min = Math.ceil(cost * 100) / 100;
  const max = Math.round(cost * DEFAULT_MARKUP * 4 * 100) / 100;
  return Math.min(max, Math.max(min, Math.round(value * 100) / 100));
}

export function setSellPrice(game, pid, value) {
  if (!game.state.sellPrices) game.state.sellPrices = {};
  game.state.sellPrices[pid] = clampSellPrice(game, pid, value);
  game.save();
}

export function resetSellPrice(game, pid) {
  if (!game.state.sellPrices) game.state.sellPrices = {};
  game.state.sellPrices[pid] = sellPrice(pid);
  game.save();
}
