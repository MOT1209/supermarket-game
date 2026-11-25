// Static game data: products, licenses, layout constants and economy tuning.

export const PRODUCTS = {
  milk:   { name: 'Milk',   price: 2.50, color: 0xf2f6ff, shape: 'carton', license: null,    cold: true },
  bread:  { name: 'Bread',  price: 1.80, color: 0xd9a441, shape: 'loaf',   license: null,    cold: false },
  apple:  { name: 'Apples', price: 1.20, color: 0xd63b3b, shape: 'sphere', license: null,    cold: false },
  water:  { name: 'Water',  price: 1.00, color: 0x8fd3ff, shape: 'bottle', license: null,    cold: true },
  coffee: { name: 'Coffee', price: 4.50, color: 0x6b4423, shape: 'can',    license: 'coffee', cold: false },
  cheese: { name: 'Cheese', price: 3.80, color: 0xf5c518, shape: 'wedge',  license: 'cheese', cold: true },
  juice:  { name: 'Juice',  price: 2.90, color: 0xff8c1a, shape: 'bottle', license: 'juice',  cold: true },
  snacks: { name: 'Snacks', price: 1.50, color: 0xe0483a, shape: 'bag',    license: 'snacks', cold: false }
};

export const LICENSES = [
  { id: 'coffee', product: 'coffee', name: 'Coffee License', cost: 200 },
  { id: 'cheese', product: 'cheese', name: 'Cheese License', cost: 260 },
  { id: 'juice',  product: 'juice',  name: 'Juice License',  cost: 320 },
  { id: 'snacks', product: 'snacks', name: 'Snacks License', cost: 180 }
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

export function sellPrice(pid) { return Math.round(PRODUCTS[pid].price * 1.7 * 100) / 100; }
export function maxSpots(level) { return 4 + (level - 1) * 4; }
