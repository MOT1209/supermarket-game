import { PRODUCTS, STARTING_SHELVES, SAVE_KEY, SHELF_CAPACITY } from '../data/products.js';

export function defaultState() {
  const prices = {}, trends = {};
  for (const k in PRODUCTS) { prices[k] = PRODUCTS[k].price; trends[k] = 0; }
  const shelves = STARTING_SHELVES.map((pid, i) => ({
    productId: pid, stock: 6, capacity: SHELF_CAPACITY, spot: i, fridge: PRODUCTS[pid].cold
  }));
  return {
    version: 2,
    cash: 500,
    day: 1,
    level: 1,
    storeName: 'FRESH MART',
    licenses: [],
    prices,
    trends,
    shelves,
    staff: { restocker: false, cashier: false },
    sensitivity: 0.0008,
    clock: 0,
    lifetimeRevenue: 0
  };
}

// Accepts older saves (v1 had the same shape, minus the version field).
function migrate(data) {
  const base = defaultState();
  if (!data || !Array.isArray(data.shelves)) return null;
  const migrated = { ...base, ...data, version: 2 };
  migrated.prices = { ...base.prices, ...(data.prices || {}) };
  migrated.trends = { ...base.trends, ...(data.trends || {}) };
  migrated.staff = { ...base.staff, ...(data.staff || {}) };
  migrated.shelves = data.shelves.map((s, i) => ({
    productId: PRODUCTS[s.productId] ? s.productId : STARTING_SHELVES[0],
    stock: Number.isFinite(s.stock) ? s.stock : 0,
    capacity: Number.isFinite(s.capacity) ? s.capacity : SHELF_CAPACITY,
    spot: Number.isFinite(s.spot) ? s.spot : i,
    fridge: !!s.fridge
  }));
  return migrated;
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
