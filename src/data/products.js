// Static game data: products, licenses, layout constants and economy tuning.

export const PRODUCTS = {
  milk:   { name: 'Milk',    price: 2.50, color: 0xf2f6ff, shape: 'carton', license: null,    cold: true,  category: 'dairy' },
  bread:  { name: 'Bread',   price: 1.80, color: 0xd9a441, shape: 'loaf',   license: null,    cold: false, category: 'bakery' },
  apple:  { name: 'Apples',  price: 1.20, color: 0xd63b3b, shape: 'sphere', license: null,    cold: false, category: 'produce' },
  water:  { name: 'Water',   price: 1.00, color: 0x8fd3ff, shape: 'bottle', license: null,    cold: true,  category: 'drinks' },
  coffee: { name: 'Coffee',  price: 4.50, color: 0x6b4423, shape: 'can',    license: 'coffee', cold: false, category: 'drinks' },
  cheese: { name: 'Cheese',  price: 3.80, color: 0xf5c518, shape: 'wedge',  license: 'cheese', cold: true,  category: 'dairy' },
  juice:  { name: 'Juice',   price: 2.90, color: 0xff8c1a, shape: 'bottle', license: 'juice',  cold: true,  category: 'drinks' },
  snacks: { name: 'Snacks',  price: 1.50, color: 0xe0483a, shape: 'bag',    license: 'snacks', cold: false, category: 'snacks' },
  eggs:   { name: 'Eggs',    price: 2.20, color: 0xf3e2c7, shape: 'egg',    license: 'eggs',   cold: true,  category: 'dairy' },
  yogurt: { name: 'Yogurt',  price: 1.90, color: 0xf7f3e8, shape: 'cup',    license: 'yogurt', cold: true,  category: 'dairy' },
  cereal: { name: 'Cereal',  price: 3.60, color: 0xd98a3d, shape: 'box',    license: 'cereal', cold: false, category: 'snacks' },
  meat:   { name: 'Meat',    price: 6.50, color: 0xb5454b, shape: 'steak',  license: 'meat',   cold: true,  category: 'butchery' }
};

export const CATEGORIES = ['dairy', 'bakery', 'produce', 'drinks', 'snacks', 'butchery'];

export const LICENSES = [
  { id: 'coffee', product: 'coffee', name: 'Coffee License',  cost: 200 },
  { id: 'cheese', product: 'cheese', name: 'Cheese License',  cost: 260 },
  { id: 'juice',  product: 'juice',  name: 'Juice License',   cost: 320 },
  { id: 'snacks', product: 'snacks', name: 'Snacks License',  cost: 180 },
  { id: 'eggs',   product: 'eggs',   name: 'Eggs License',    cost: 220 },
  { id: 'yogurt', product: 'yogurt', name: 'Yogurt License',  cost: 240 },
  { id: 'cereal', product: 'cereal', name: 'Cereal License',  cost: 300 },
  { id: 'meat',   product: 'meat',   name: 'Butchery License', cost: 480 }
];

export const DENOMS = [100, 50, 20, 10, 5, 2, 1, 0.5, 0.25, 0.1, 0.05, 0.01];

export const SHELF_SPOTS = [
  [-7, -7], [-3, -7], [1, -7], [5, -7],
  [-7, -2], [-3, -2], [1, -2], [5, -2],
  [-7,  3], [-3,  3], [1,  3], [5,  3]
];

export const STARTING_SHELVES = ['milk', 'bread', 'apple', 'water'];
export const SAVE_KEY = 'freshmart_v2_save';
export const DAY_SECONDS = 420;          // 8:00 AM -> 9:00 PM in 7 real minutes
export const SHELF_CAPACITY = 12;
export const WAGE_RESTOCKER = 120;
export const WAGE_CASHIER = 150;
export const RECYCLE_BONUS = 0.5;
export const MAX_CUSTOMERS = 7;
export const BOX_COST_MULTIPLIER = 6;

// --- Daily operating costs (charged at closing) ---
export const RENT_PER_DAY = 80;
export const FRIDGE_UPKEEP = 6;           // per refrigerator per day

// --- Reputation (0..5) drives how many customers show up ---
export const REPUTATION_MAX = 5;
export const REPUTATION_START = 3.0;
export const HAPPY_REP_GAIN = 0.05;
export const ANGRY_REP_LOSS = 0.15;
export const SPAWN_BASE_RATE = 0.13;      // customers per second at neutral reputation

// --- Default markup on wholesale cost for the shelf price ---
export const DEFAULT_MARKUP = 1.7;

export function sellPrice(pid) {
  return Math.round(PRODUCTS[pid].price * DEFAULT_MARKUP * 100) / 100;
}

// Physical limit is the number of shelf spots; the level only gates how many
// of them you are allowed to use at once.
export function maxSpots(level) {
  const unlocked = 4 + (level - 1) * 4;
  return Math.min(unlocked, SHELF_SPOTS.length);
}
