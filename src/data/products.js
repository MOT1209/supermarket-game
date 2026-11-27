// Static game data: products, licenses, layout constants and economy tuning.

export const PRODUCTS = {
  milk: {
    name: 'Milk',
    price: 2.5,
    color: 0xf2f6ff,
    shape: 'carton',
    license: null,
    cold: true,
    category: 'dairy'
  },
  bread: {
    name: 'Bread',
    price: 1.8,
    color: 0xd9a441,
    shape: 'loaf',
    license: null,
    cold: false,
    category: 'bakery'
  },
  apple: {
    name: 'Apples',
    price: 1.2,
    color: 0xd63b3b,
    shape: 'sphere',
    license: null,
    cold: false,
    category: 'produce'
  },
  water: {
    name: 'Water',
    price: 1.0,
    color: 0x8fd3ff,
    shape: 'bottle',
    license: null,
    cold: true,
    category: 'drinks'
  },
  coffee: {
    name: 'Coffee',
    price: 4.5,
    color: 0x6b4423,
    shape: 'can',
    license: 'coffee',
    cold: false,
    category: 'drinks'
  },
  cheese: {
    name: 'Cheese',
    price: 3.8,
    color: 0xf5c518,
    shape: 'wedge',
    license: 'cheese',
    cold: true,
    category: 'dairy'
  },
  juice: {
    name: 'Juice',
    price: 2.9,
    color: 0xff8c1a,
    shape: 'bottle',
    license: 'juice',
    cold: true,
    category: 'drinks'
  },
  snacks: {
    name: 'Snacks',
    price: 1.5,
    color: 0xe0483a,
    shape: 'bag',
    license: 'snacks',
    cold: false,
    category: 'snacks'
  },
  eggs: {
    name: 'Eggs',
    price: 2.2,
    color: 0xf3e2c7,
    shape: 'egg',
    license: 'eggs',
    cold: true,
    category: 'dairy'
  },
  yogurt: {
    name: 'Yogurt',
    price: 1.9,
    color: 0xf7f3e8,
    shape: 'cup',
    license: 'yogurt',
    cold: true,
    category: 'dairy'
  },
  cereal: {
    name: 'Cereal',
    price: 3.6,
    color: 0xd98a3d,
    shape: 'box',
    license: 'cereal',
    cold: false,
    category: 'snacks'
  },
  meat: {
    name: 'Meat',
    price: 6.5,
    color: 0xb5454b,
    shape: 'steak',
    license: 'meat',
    cold: true,
    category: 'butchery'
  }
};

export const CATEGORIES = ['dairy', 'bakery', 'produce', 'drinks', 'snacks', 'butchery'];

export const LICENSES = [
  { id: 'coffee', product: 'coffee', name: 'Coffee License', cost: 200 },
  { id: 'cheese', product: 'cheese', name: 'Cheese License', cost: 260 },
  { id: 'juice', product: 'juice', name: 'Juice License', cost: 320 },
  { id: 'snacks', product: 'snacks', name: 'Snacks License', cost: 180 },
  { id: 'eggs', product: 'eggs', name: 'Eggs License', cost: 220 },
  { id: 'yogurt', product: 'yogurt', name: 'Yogurt License', cost: 240 },
  { id: 'cereal', product: 'cereal', name: 'Cereal License', cost: 300 },
  { id: 'meat', product: 'meat', name: 'Butchery License', cost: 480 }
];

export const DENOMS = [100, 50, 20, 10, 5, 2, 1, 0.5, 0.25, 0.1, 0.05, 0.01];

// The first 12 spots are the original sales floor. Later spots live in the
// rooms unlocked by store expansions (back stockroom, wings and warehouse).
// A shelf also stores x/z/rot so the build system can place furniture
// anywhere; these presets are used for automatic placement and old saves.
export const SHELF_SPOTS = [
  [-7, -7],
  [-3, -7],
  [1, -7],
  [5, -7],
  [-7, -2],
  [-3, -2],
  [1, -2],
  [5, -2],
  [-7, 3],
  [-3, 3],
  [1, 3],
  [5, 3],
  // Back stockroom (level 2)
  [-6, -16],
  [-2, -16],
  [2, -16],
  [6, -16],
  // East wing (level 3)
  [16, -5.25],
  [16, -1.75],
  [16, 1.75],
  [16, 5.25],
  // West wing (level 4)
  [-16, -5.25],
  [-16, -1.75],
  [-16, 1.75],
  [-16, 5.25],
  // Warehouse extension (level 5)
  [-6, -24],
  [-2, -24],
  [2, -24],
  [6, -24],
  // East / west extensions (levels 6-7)
  [24, -5.25],
  [24, -1.75],
  [24, 1.75],
  [24, 5.25],
  [-24, -5.25],
  [-24, -1.75],
  [-24, 1.75],
  [-24, 5.25]
];

export const SHELF_ROTATIONS = [
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  Math.PI / 2,
  Math.PI / 2,
  Math.PI / 2,
  Math.PI / 2,
  -Math.PI / 2,
  -Math.PI / 2,
  -Math.PI / 2,
  -Math.PI / 2,
  0,
  0,
  0,
  0,
  Math.PI / 2,
  Math.PI / 2,
  Math.PI / 2,
  Math.PI / 2,
  -Math.PI / 2,
  -Math.PI / 2,
  -Math.PI / 2,
  -Math.PI / 2
];

export const STARTING_SHELVES = ['milk', 'bread', 'apple', 'water'];
export const SAVE_KEY = 'freshmart_v2_save';
export const DAY_SECONDS = 420; // 8:00 AM -> 9:00 PM in 7 real minutes
export const SHELF_CAPACITY = 12;
export const WAGE_RESTOCKER = 120;
export const WAGE_CASHIER = 150;
export const RECYCLE_BONUS = 0.5;
export const MAX_CUSTOMERS = 7;
export const BOX_COST_MULTIPLIER = 6;

// --- Daily operating costs (charged at closing) ---
export const RENT_PER_DAY = 80;
export const FRIDGE_UPKEEP = 6; // per refrigerator per day

// --- Reputation (0..5) drives how many customers show up ---
export const REPUTATION_MAX = 5;
export const REPUTATION_START = 3.0;
export const HAPPY_REP_GAIN = 0.05;
export const ANGRY_REP_LOSS = 0.15;
export const SPAWN_BASE_RATE = 0.13; // customers per second at neutral reputation

// --- Default markup on wholesale cost for the shelf price ---
export const DEFAULT_MARKUP = 1.7;

export function sellPrice(pid) {
  return Math.round(PRODUCTS[pid].price * DEFAULT_MARKUP * 100) / 100;
}

// The base floor has 12 shelf spots and each of the six expansions opens four
// more, so level 7 unlocks all 36 physical spots.
export function maxSpots(level) {
  const lvl = Math.max(1, Math.floor(Number(level) || 1));
  return Math.min(12 + (lvl - 1) * 4, SHELF_SPOTS.length);
}
