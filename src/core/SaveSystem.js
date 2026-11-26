import {
  PRODUCTS,
  LICENSES,
  SHELF_SPOTS,
  SHELF_ROTATIONS,
  STARTING_SHELVES,
  SAVE_KEY,
  SHELF_CAPACITY,
  sellPrice,
  REPUTATION_START,
  REPUTATION_MAX
} from '../data/products.js';
import {
  BUILD_CATALOG,
  FIXTURE_TYPES,
  insideStore,
  normalizeRotation,
  snap
} from '../data/build.js';
import { rounded } from '../utils/math.js';
import { ACHIEVEMENT_IDS } from '../systems/Achievements.js';

const GRAPHICS_MODES = new Set(['low', 'medium', 'high']);
const MAX_HISTORY = 60;
const MAX_FIXTURES = 80;
const BUSINESS_IDS = ['bakery', 'cafe', 'pharmacy'];

export function defaultState() {
  const prices = {};
  const trends = {};
  const sellPrices = {};
  for (const k in PRODUCTS) {
    prices[k] = PRODUCTS[k].price;
    trends[k] = 0;
    sellPrices[k] = sellPrice(k);
  }
  const shelves = STARTING_SHELVES.map((pid, i) => ({
    productId: pid,
    stock: 6,
    capacity: SHELF_CAPACITY,
    spot: i,
    x: SHELF_SPOTS[i][0],
    z: SHELF_SPOTS[i][1],
    rot: SHELF_ROTATIONS[i] || 0,
    fridge: PRODUCTS[pid].cold,
    freezer: false
  }));
  return {
    version: 4,
    cash: 500,
    day: 1,
    level: 1,
    storeName: 'FRESH MART',
    licenses: [],
    prices,
    trends,
    sellPrices,
    shelves,
    fixtures: [],
    businesses: { day: 1, offers: { bakery: {}, cafe: {}, pharmacy: {} } },
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
  return saved
    .filter((r) => r && Number.isFinite(r.day) && Number.isFinite(r.revenue))
    .slice(-MAX_HISTORY)
    .map((r) => {
      const row = {
        day: Math.floor(r.day),
        revenue: safeNumber(r.revenue, 0, 0, 1e15),
        stockCost: safeNumber(r.stockCost, 0, 0, 1e15),
        recycle: safeNumber(r.recycle, 0, 0, 1e9),
        happy: Math.floor(safeNumber(r.happy, 0, 0, 1e9)),
        angry: Math.floor(safeNumber(r.angry, 0, 0, 1e9))
      };
      if (Number.isFinite(r.net)) row.net = rounded(safeNumber(r.net, 0, -1e15, 1e15));
      if (Number.isFinite(r.wages)) row.wages = safeNumber(r.wages, 0, 0, 1e12);
      if (Number.isFinite(r.upkeep)) row.upkeep = safeNumber(r.upkeep, 0, 0, 1e12);
      if (Number.isFinite(r.bonus)) row.bonus = safeNumber(r.bonus, 0, 0, 1e12);
      return row;
    });
}

function safeFixtures(saved, level) {
  if (!Array.isArray(saved)) return [];
  const out = [];
  const ids = new Set();
  for (const f of saved) {
    if (out.length >= MAX_FIXTURES) break;
    if (!f || !FIXTURE_TYPES.has(f.type)) continue;
    const item = BUILD_CATALOG[f.type];
    if (!item) continue;
    if (item.minLevel && level < item.minLevel) continue;
    const x = snap(safeNumber(f.x, 0, -40, 40));
    const z = snap(safeNumber(f.z, 0, -40, 40));
    if (!insideStore(x, z, level, 0.2)) continue;
    const id =
      typeof f.id === 'string' && f.id.trim() && !ids.has(f.id)
        ? f.id.trim().slice(0, 40)
        : `${f.type}_${out.length}_${Math.floor(x * 10)}_${Math.floor(z * 10)}`;
    if (ids.has(id)) continue;
    ids.add(id);
    out.push({ id, type: f.type, x, z, rot: normalizeRotation(f.rot) });
  }
  return out;
}

function safeBusinesses(saved, day) {
  const root = saved && typeof saved === 'object' ? saved : {};
  const savedOffers = root.offers && typeof root.offers === 'object' ? root.offers : {};
  const offers = {};
  for (const id of BUSINESS_IDS) {
    const entry = savedOffers[id];
    const counts = {};
    if (entry && typeof entry === 'object') {
      for (const key of Object.keys(entry)) {
        if (Number.isFinite(entry[key])) {
          counts[key] = Math.floor(safeNumber(entry[key], 0, 0, 99));
        }
      }
    }
    offers[id] = counts;
  }
  return {
    day: Math.floor(safeNumber(root.day, day, 1, 100000)),
    offers
  };
}

// Accepts older saves (v1 had the same shape minus the version field, v3 had
// no fixtures/businesses). The shelf dedupe loop is deliberately bounded: a
// corrupt save with thousands of shelves must never lock the main thread.
export function migrate(data) {
  const base = defaultState();
  if (!data || !Array.isArray(data.shelves)) return null;
  const m = { ...base, ...data, version: 4 };

  m.cash = rounded(safeNumber(m.cash, base.cash, 0, 1e12));
  m.day = Math.floor(safeNumber(m.day, base.day, 1, 100000));
  m.level = Math.floor(safeNumber(m.level, base.level, 1, 7));
  m.clock = safeNumber(m.clock, 0, 0, 86400);
  m.lifetimeRevenue = safeNumber(m.lifetimeRevenue, 0, 0, 1e15);
  m.reputation = safeNumber(m.reputation, REPUTATION_START, 0, REPUTATION_MAX);
  m.sensitivity =
    Number.isFinite(m.sensitivity) && m.sensitivity > 0 && m.sensitivity <= 0.01
      ? m.sensitivity
      : base.sensitivity;
  m.volume = safeNumber(m.volume, 0.8, 0, 1);
  m.graphics = GRAPHICS_MODES.has(m.graphics) ? m.graphics : base.graphics;
  m.storeName =
    typeof m.storeName === 'string' && m.storeName.trim()
      ? m.storeName.trim().slice(0, 24)
      : base.storeName;

  m.prices = safeMap(data.prices, base.prices, 0.01, 1e6);
  m.trends = safeMap(data.trends, base.trends, -1, 1);
  m.sellPrices = safeMap(data.sellPrices, base.sellPrices, 0.01, 1e6);
  m.licenses = Array.isArray(data.licenses)
    ? [...new Set(data.licenses.filter((id) => LICENSES.some((l) => l.id === id)))]
    : [];
  m.achievements = Array.isArray(data.achievements)
    ? [...new Set(data.achievements.filter((id) => ACHIEVEMENT_IDS.has(id)))]
    : [];
  m.history = safeHistory(data.history);
  m.staff = {
    restocker: !!(data.staff && data.staff.restocker),
    cashier: !!(data.staff && data.staff.cashier)
  };
  m.fixtures = safeFixtures(data.fixtures, m.level);
  m.businesses = safeBusinesses(data.businesses, m.day);

  const usedSpots = new Set();
  m.shelves = [];
  const maxShelves = Math.min(data.shelves.length, SHELF_SPOTS.length);
  for (let i = 0; i < maxShelves; i++) {
    const s = data.shelves[i];
    const productId = PRODUCTS[s?.productId] ? s.productId : STARTING_SHELVES[0];
    const capacity = Math.floor(safeNumber(s?.capacity, SHELF_CAPACITY, 1, 1000));
    const requestedSpot = Math.floor(safeNumber(s?.spot, i, 0, SHELF_SPOTS.length - 1));
    let spot = requestedSpot;
    for (let tries = 0; tries < SHELF_SPOTS.length && usedSpots.has(spot); tries++) {
      spot = (spot + 1) % SHELF_SPOTS.length;
    }
    // Every physical spot is taken; drop the overflow instead of looping.
    if (usedSpots.has(spot)) continue;
    usedSpots.add(spot);

    const preset = SHELF_SPOTS[spot];
    const savedX = Number.isFinite(s?.x) ? snap(s.x) : null;
    const savedZ = Number.isFinite(s?.z) ? snap(s.z) : null;
    const savedRot = Number.isFinite(s?.rot) ? normalizeRotation(s.rot) : null;
    const usablePosition =
      savedX !== null && savedZ !== null && insideStore(savedX, savedZ, m.level, 0.2);

    m.shelves.push({
      productId,
      stock: Math.floor(safeNumber(s?.stock, 0, 0, capacity)),
      capacity,
      spot,
      x: usablePosition ? savedX : preset[0],
      z: usablePosition ? savedZ : preset[1],
      rot: savedRot !== null ? savedRot : SHELF_ROTATIONS[spot] || 0,
      fridge: !!s?.fridge,
      freezer: !!s?.freezer
    });
  }

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
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}
