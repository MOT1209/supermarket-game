import { PRODUCTS, SHELF_CAPACITY, SHELF_ROTATIONS, SHELF_SPOTS, maxSpots } from './products.js';

// ---------------------------------------------------------------------------
// Store geometry and construction data
// ---------------------------------------------------------------------------
// The original 24 x 24 sales floor stays at the origin. Each expansion adds a
// rectangular room. The walls between the new room and the existing floor are
// removed so the whole store remains walkable.
export const BUILD_GRID = 0.5;
export const WALL_HEIGHT = 5;
export const DOOR_WIDTH = 4;
export const DOOR_HEIGHT = 3.2;

export const STORE_BASE = Object.freeze({
  id: 'sales_floor',
  minX: -12,
  maxX: 12,
  minZ: -12,
  maxZ: 12
});

export const EXPANSIONS = Object.freeze([
  {
    level: 2,
    id: 'stockroom',
    name: 'Back Stockroom',
    wall: 'back',
    rect: { minX: -8, maxX: 8, minZ: -20, maxZ: -12 }
  },
  {
    level: 3,
    id: 'east_wing',
    name: 'East Wing',
    wall: 'right',
    rect: { minX: 12, maxX: 20, minZ: -8, maxZ: 8 }
  },
  {
    level: 4,
    id: 'west_wing',
    name: 'West Wing',
    wall: 'left',
    rect: { minX: -20, maxX: -12, minZ: -8, maxZ: 8 }
  },
  {
    level: 5,
    id: 'warehouse',
    name: 'Warehouse',
    wall: 'back',
    rect: { minX: -8, maxX: 8, minZ: -28, maxZ: -20 }
  },
  {
    level: 6,
    id: 'east_extension',
    name: 'East Loading Bay',
    wall: 'right',
    rect: { minX: 20, maxX: 28, minZ: -8, maxZ: 8 }
  },
  {
    level: 7,
    id: 'west_extension',
    name: 'West Loading Bay',
    wall: 'left',
    rect: { minX: -28, maxX: -20, minZ: -8, maxZ: 8 }
  }
]);

export const MAX_STORE_LEVEL = EXPANSIONS[EXPANSIONS.length - 1].level;

export function unlockedExpansions(level) {
  const n = Math.max(1, Math.floor(Number(level) || 1));
  return EXPANSIONS.filter((e) => e.level <= n);
}

export function storeFloors(level) {
  return [STORE_BASE, ...unlockedExpansions(level).map((e) => e.rect)];
}

// The doorway an expansion needs in the wall it shares with the already-built
// store. `axis` is the direction the wall runs along; `at` is the constant
// coordinate of that wall.
export function expansionDoorway(expansion) {
  if (!expansion || !expansion.rect) return null;
  const r = expansion.rect;
  if (expansion.wall === 'back') {
    const cx = (r.minX + r.maxX) / 2;
    return {
      axis: 'x',
      at: r.maxZ,
      min: cx - DOOR_WIDTH / 2,
      max: cx + DOOR_WIDTH / 2,
      height: DOOR_HEIGHT
    };
  }
  const cz = (r.minZ + r.maxZ) / 2;
  return {
    axis: 'z',
    at: expansion.wall === 'right' ? r.minX : r.maxX,
    min: cz - DOOR_WIDTH / 2,
    max: cz + DOOR_WIDTH / 2,
    height: DOOR_HEIGHT
  };
}

export function insideRect(x, z, r, padding = 0) {
  return (
    x >= r.minX + padding && x <= r.maxX - padding && z >= r.minZ + padding && z <= r.maxZ - padding
  );
}

export function insideStore(x, z, level, padding = 0) {
  return storeFloors(level).some((r) => insideRect(x, z, r, padding));
}

export function storeBounds(level) {
  const floors = storeFloors(level);
  return {
    minX: Math.min(...floors.map((r) => r.minX)),
    maxX: Math.max(...floors.map((r) => r.maxX)),
    minZ: Math.min(...floors.map((r) => r.minZ)),
    maxZ: Math.max(...floors.map((r) => r.maxZ))
  };
}

export function expansionCost(level) {
  return 400 * Math.max(1, Math.floor(Number(level) || 1));
}

// ---------------------------------------------------------------------------
// Construction catalogue
// ---------------------------------------------------------------------------
export const FIXTURE_TYPES = new Set(['counter', 'plant', 'bench', 'sign', 'storage']);

export const BUILD_CATALOG = Object.freeze({
  shelf: {
    id: 'shelf',
    name: 'Shelf',
    cost: 150,
    kind: 'shelf',
    width: 2.2,
    depth: 1.0,
    collision: true,
    description: 'Stores up to 12 units of one product.'
  },
  fridge: {
    id: 'fridge',
    name: 'Refrigerator',
    cost: 280,
    kind: 'shelf',
    width: 2.2,
    depth: 1.0,
    collision: true,
    cold: true,
    fridge: true,
    description: 'Required for chilled products. Adds daily utility cost.'
  },
  freezer: {
    id: 'freezer',
    name: 'Freezer',
    cost: 360,
    kind: 'shelf',
    width: 2.4,
    depth: 1.1,
    collision: true,
    cold: true,
    fridge: true,
    freezer: true,
    description: 'Premium chilled display with a glass door.'
  },
  counter: {
    id: 'counter',
    name: 'Service Counter',
    cost: 220,
    kind: 'fixture',
    width: 2.6,
    depth: 1.0,
    collision: true,
    description: 'A sturdy counter for displays and customer service.'
  },
  plant: {
    id: 'plant',
    name: 'Planter',
    cost: 45,
    kind: 'fixture',
    width: 0.8,
    depth: 0.8,
    collision: true,
    description: 'A little greenery that makes the aisles feel welcoming.'
  },
  bench: {
    id: 'bench',
    name: 'Bench',
    cost: 90,
    kind: 'fixture',
    width: 2.0,
    depth: 0.7,
    collision: true,
    description: 'A rest spot near the entrance.'
  },
  sign: {
    id: 'sign',
    name: 'Aisle Sign',
    cost: 60,
    kind: 'fixture',
    width: 1.2,
    depth: 0.3,
    collision: false,
    description: 'A freestanding sign to label a section.'
  },
  storage: {
    id: 'storage',
    name: 'Storage Zone',
    cost: 0,
    kind: 'fixture',
    width: 4,
    depth: 3,
    collision: false,
    floorMarker: true,
    minLevel: 2,
    description: 'Marks a stockroom drop zone. Boxes dropped here snap into a tidy stack.'
  }
});

export const SHELF_TYPES = new Set(['shelf', 'fridge', 'freezer']);

export function catalogItem(type) {
  return BUILD_CATALOG[type] || null;
}

export function isShelfType(type) {
  return SHELF_TYPES.has(type);
}

export function snap(value, grid = BUILD_GRID) {
  return Math.round((Number(value) || 0) / grid) * grid;
}

export function normalizeRotation(rot) {
  const tau = Math.PI * 2;
  let r = (Number(rot) || 0) % tau;
  if (r < 0) r += tau;
  return Math.round(r * 10000) / 10000;
}

// Width/depth of an item after a 90-degree rotation.
export function rotatedSize(width, depth, rot) {
  const quarter = Math.abs(Math.sin(Number(rot) || 0)) > 0.7;
  return quarter ? { width: depth, depth: width } : { width, depth };
}

export function itemRect(type, x, z, rot) {
  const item = catalogItem(type);
  if (!item) return null;
  const size = rotatedSize(item.width, item.depth, rot);
  return {
    minX: x - size.width / 2,
    maxX: x + size.width / 2,
    minZ: z - size.depth / 2,
    maxZ: z + size.depth / 2
  };
}

export function rectsOverlap(a, b, padding = 0) {
  return (
    a.minX - padding < b.maxX &&
    a.maxX + padding > b.minX &&
    a.minZ - padding < b.maxZ &&
    a.maxZ + padding > b.minZ
  );
}

export function shelfRect(sh) {
  const [sx, sz] = SHELF_SPOTS[sh.spot] || [0, 0];
  const x = Number.isFinite(sh.x) ? sh.x : sx;
  const z = Number.isFinite(sh.z) ? sh.z : sz;
  const rot = Number.isFinite(sh.rot) ? sh.rot : SHELF_ROTATIONS[sh.spot] || 0;
  const type = sh.freezer ? 'freezer' : sh.fridge ? 'fridge' : 'shelf';
  return itemRect(type, x, z, rot);
}

export function fixtureRect(f) {
  return itemRect(f.type, f.x, f.z, f.rot || 0);
}

export function shelfPosition(sh) {
  const [sx, sz] = SHELF_SPOTS[sh.spot] || [0, 0];
  return {
    x: Number.isFinite(sh.x) ? sh.x : sx,
    z: Number.isFinite(sh.z) ? sh.z : sz,
    rot: Number.isFinite(sh.rot) ? sh.rot : SHELF_ROTATIONS[sh.spot] || 0
  };
}

// A shelf is always approached from its front (local +Z).
export function shelfFront(sh, distance = 1.25) {
  const p = shelfPosition(sh);
  return {
    x: p.x + Math.sin(p.rot) * distance,
    z: p.z + Math.cos(p.rot) * distance
  };
}

export function nextFreeSpot(level, shelves) {
  const used = new Set(shelves.map((s) => s.spot));
  const limit = Math.min(maxSpots(level), SHELF_SPOTS.length);
  for (let i = 0; i < limit; i++) {
    const [x, z] = SHELF_SPOTS[i];
    if (!insideStore(x, z, level, 0.4)) continue;
    if (!used.has(i)) return i;
  }
  // Never fall through to spots the current level has not unlocked.
  return -1;
}

export function shelfDataFromSpot(spot, productId, options = {}) {
  const [x, z] = SHELF_SPOTS[spot] || [0, 0];
  return {
    productId,
    stock: options.stock ?? 0,
    capacity: options.capacity ?? SHELF_CAPACITY,
    spot,
    x,
    z,
    rot: options.rot ?? SHELF_ROTATIONS[spot] ?? 0,
    fridge: !!options.fridge,
    freezer: !!options.freezer
  };
}

// Validate a proposed placement against the unlocked floor, static walls and
// every existing buildable. Returns a machine-readable reason for the UI.
export function validatePlacement({
  type,
  x,
  z,
  rot = 0,
  level = 1,
  colliders = [],
  shelves = [],
  fixtures = [],
  ignore = null,
  margin = 0.08
}) {
  const item = catalogItem(type);
  if (!item) return { ok: false, reason: 'Unknown build item' };
  if (item.minLevel && level < item.minLevel) {
    return { ok: false, reason: `Requires store level ${item.minLevel}` };
  }

  const sx = snap(x);
  const sz = snap(z);
  const rect = itemRect(type, sx, sz, rot);
  if (!rect) return { ok: false, reason: 'Invalid item' };

  if (!insideStore(sx, sz, level, Math.max(0.2, item.depth / 2))) {
    return { ok: false, reason: 'Place it inside the unlocked store floor' };
  }

  // Keep a little clearance from the walls. Doorways remain clear because the
  // base wall colliders already have an entrance gap.
  for (const c of colliders) {
    if (rectsOverlap(rect, c, margin)) {
      return { ok: false, reason: 'Blocked by the store structure' };
    }
  }

  for (const sh of shelves) {
    if (ignore && ignore.kind === 'shelf' && ignore.id === sh.spot) continue;
    const other = shelfRect(sh);
    if (other && rectsOverlap(rect, other, 0.12)) {
      return { ok: false, reason: 'Too close to another shelf' };
    }
  }

  for (const f of fixtures) {
    if (ignore && ignore.kind === 'fixture' && ignore.id === f.id) continue;
    const other = fixtureRect(f);
    if (other && rectsOverlap(rect, other, 0.12)) {
      return { ok: false, reason: 'Too close to another fixture' };
    }
  }

  return { ok: true, x: sx, z: sz, rot: normalizeRotation(rot), rect };
}

// Compatibility helper for the old terminal purchase flow. It returns the
// next free preset so the economy code can keep working without a ghost.
export function autoPlacement(level, shelves) {
  const spot = nextFreeSpot(level, shelves);
  if (spot < 0) return null;
  return {
    spot,
    x: SHELF_SPOTS[spot][0],
    z: SHELF_SPOTS[spot][1],
    rot: SHELF_ROTATIONS[spot] || 0
  };
}

export function productAllowed(game, pid) {
  const p = PRODUCTS[pid];
  if (!p) return false;
  return (
    !p.license || (Array.isArray(game.state.licenses) && game.state.licenses.includes(p.license))
  );
}

export function shelfProductOptions(game) {
  return Object.keys(PRODUCTS).filter((pid) => productAllowed(game, pid));
}
