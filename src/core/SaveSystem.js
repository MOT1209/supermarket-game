import {
  PRODUCTS, LICENSES, SHELF_SPOTS, STARTING_SHELVES, SAVE_KEY, SHELF_CAPACITY,
  sellPrice, REPUTATION_START, REPUTATION_MAX
} from '../data/products.js';
import { rounded } from '../utils/math.js';
import { ACHIEVEMENT_IDS } from '../systems/Achievements.js';

const GRAPHICS_MODES = new Set(['low', 'medium', 'high']);
const MAX_HISTORY = 60;

export function defaultState() {
  const prices = {}, trends = {}, sellPrices = {};
  for (const k in PRODUCTS) {
    prices[k] = PRODUCTS[k].price;
    trends[k] = 0;
    sellPrices[k] = sellPrice(k);
  }
  const shelves = STARTING_SHELVES.map((pid, i) => ({
    productId: pid, stock: 6, capacity: SHELF_CAPACITY, spot: i, fridge: PRODUCTS[pid].cold
  }));
  return {
    version: 3,
    cash: 500,
    day: 1,
    level: 1,
    storeName: 'FRESH MART',
    licenses: [],
    prices,
    trends,
    sellPrices,
    shelves,
    staff: { restocker: false, cashier: false },
    sensitivity: 0.0008,
    volume: 0.8,
    graphics: 'high',
    reputation: REPUTATION_START,
    clock: 0,
    lifetimeRevenue: 0,
    achievements: [],
    history: []
  };
}

// Finite numbers are clamped into a safe range; missing/corrupt values fall
// back to the default. This keeps a hand-edited or truncated save playable.
function safeNumber(value, fallback, min, max) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function safeMap(saved, base, min, max) {
  const result = { ...base };
  if (!saved || typeof saved !== 'object') return result;
  for (const key of Object.keys(base)) {
    result[key] = safeNumber(saved[key], base[key], min, max);
  }
  return result;
}

// Daily analytics rows: keep only structurally valid entries, newest last.
function safeHistory(saved) {
  if (!Array.isArray(saved)) return [];
  return saved.filter(r => r && Number.isFinite(r.day) && Number.isFinite(r.revenue))
    .slice(-MAX_HISTORY)
    .map(r => ({
      day: Math.floor(r.day),
      revenue: safeNumber(r.revenue, 0, 0, 1e15),
      stockCost: safeNumber(r.stockCost, 0, 0, 1e15),
      recycle: safeNumber(r.recycle, 0, 0, 1e9),
      happy: Math.floor(safeNumber(r.happy, 0, 0, 1e9)),
      angry: Math.floor(safeNumber(r.angry, 0, 0, 1e9)),
      ...(Number.isFinite(r.net) ? { net: rounded(safeNumber(r.net, 0, -1e15, 1e15)) } : {})
    }));
}

// Accepts older saves (v1 had the same shape, minus the version field).
export function migrate(data) {
  const base = defaultState();
  if (!data || !Array.isArray(data.shelves)) return null;
  const m = { ...base, ...data, version: 3 };

  m.cash = rounded(safeNumber(m.cash, base.cash, 0, 1e12));
  m.day = Math.floor(safeNumber(m.day, base.day, 1, 100000));
  m.level = Math.floor(safeNumber(m.level, base.level, 1, 100));
  m.clock = safeNumber(m.clock, 0, 0, 86400);
  m.lifetimeRevenue = safeNumber(m.lifetimeRevenue, 0, 0, 1e15);
  m.reputation = safeNumber(m.reputation, REPUTATION_START, 0, REPUTATION_MAX);
  m.sensitivity = (Number.isFinite(m.sensitivity) && m.sensitivity > 0 && m.sensitivity <= 0.01)
    ? m.sensitivity : base.sensitivity;
  m.volume = safeNumber(m.volume, 0.8, 0, 1);
  m.graphics = GRAPHICS_MODES.has(m.graphics) ? m.graphics : base.graphics;
  m.storeName = (typeof m.storeName === 'string' && m.storeName.trim())
    ? m.storeName.trim().slice(0, 24) : base.storeName;

  m.prices = safeMap(data.prices, base.prices, 0.01, 1e6);
  m.trends = safeMap(data.trends, base.trends, -1, 1);
  m.sellPrices = safeMap(data.sellPrices, base.sellPrices, 0.01, 1e6);
  m.licenses = Array.isArray(data.licenses)
    ? [...new Set(data.licenses.filter(id => LICENSES.some(l => l.id === id)))] : [];
  m.achievements = Array.isArray(data.achievements)
    ? [...new Set(data.achievements.filter(id => ACHIEVEMENT_IDS.has(id)))] : [];
  m.history = safeHistory(data.history);
  m.staff = {
    restocker: !!(data.staff && data.staff.restocker),
    cashier: !!(data.staff && data.staff.cashier)
  };

  const usedSpots = new Set();
  m.shelves = data.shelves.map((s, i) => {
    const productId = PRODUCTS[s?.productId] ? s.productId : STARTING_SHELVES[0];
    const capacity = Math.floor(safeNumber(s?.capacity, SHELF_CAPACITY, 1, 1000));
    const requestedSpot = Math.floor(safeNumber(s?.spot, i, 0, SHELF_SPOTS.length - 1));
    let spot = requestedSpot;
    while (usedSpots.has(spot)) spot = (spot + 1) % SHELF_SPOTS.length;
    usedSpots.add(spot);
    return {
      productId,
      stock: Math.floor(safeNumber(s?.stock, 0, 0, capacity)),
      capacity,
      spot,
      fridge: !!s?.fridge
    };
  });

  return m;
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw));
  } catch (e) {
    console.warn('Save load failed, starting fresh:', e);
    return null;
  }
}

export function saveGame(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.warn('Save failed:', e);
    return false;
  }
}

export function deleteSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
}
