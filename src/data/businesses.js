// Functional neighbours across Main Street. Every business has a physical
// interior, a counter the player can interact with, a work station with its own
// mini-game and staff/customers on the floor. The building footprint is shared
// so the storefronts line up, while each style gives the exterior a unique
// facade, awning, window display and sign.
//
// Local shop space: the entrance is (0, 0) and the interior extends toward +Z.
// `station` coordinates are local to the storefront group.

const HALF_WIDTH = 6.2;
const FRONT_Z = 36;
const BACK_Z = 48;

function shopBuilding(centerX) {
  return {
    minX: centerX - HALF_WIDTH,
    maxX: centerX + HALF_WIDTH,
    minZ: FRONT_Z,
    maxZ: BACK_Z
  };
}

export const BUSINESSES = {
  bakery: {
    id: 'bakery',
    name: 'Sunrise Bakery',
    shortName: 'BAKERY',
    tagline: 'Warm bread, pastries and early-morning smells.',
    color: 0xd9a441,
    accent: 0x6f3f1e,
    trim: 0xf1e3c4,
    facade: 0x9c5a3c,
    awning: 0xb84a2e,
    signColor: '#4a2410',
    signText: '#fff2d2',
    glow: 0xffc266,
    building: shopBuilding(-28),
    entrance: { x: -28, z: 36.2 },
    counter: { x: -28, z: 44.1, rot: 0 },
    keeper: { x: -28, z: 45.25 },
    door: { width: 2.8 },
    exterior: { style: 'bakery', bladeSide: 1 },
    staff: { name: 'Nora', role: 'baker' },
    activity: { station: { x: -4.55, z: 4.7, rot: Math.PI / 2 }, label: 'Bakery oven' },
    customerSpots: [
      [-1.4, 2.8],
      [1.4, 3.1],
      [-1.5, 5.4],
      [1.5, 5.7],
      [0, 6.9]
    ],
    offers: [
      {
        id: 'bread_box',
        label: 'Buy fresh bread box',
        cost: 18,
        dailyLimit: 1,
        description: 'Six loaves delivered to your store entrance.',
        effect: { type: 'box', product: 'bread', qty: 6 }
      },
      {
        id: 'sell_bread',
        label: 'Sell surplus bread',
        cost: 0,
        dailyLimit: 1,
        description: 'Sell 4 bread units for $14 and +0.10 reputation.',
        requiresStock: { product: 'bread', qty: 4 },
        effect: { type: 'sell', product: 'bread', qty: 4, payout: 14, reputation: 0.1 }
      }
    ]
  },
  cafe: {
    id: 'cafe',
    name: 'Corner Café',
    shortName: 'CAFÉ',
    tagline: 'Espresso, pastries and a place to watch the city.',
    color: 0x4f8f6a,
    accent: 0x173f2c,
    trim: 0xe8dcc4,
    facade: 0x265740,
    awning: 0x1c4a34,
    signColor: '#123226',
    signText: '#f2e7cd',
    glow: 0x9ef0b4,
    building: shopBuilding(-14),
    entrance: { x: -14, z: 36.2 },
    counter: { x: -14, z: 44.1, rot: 0 },
    keeper: { x: -14, z: 45.25 },
    door: { width: 2.8 },
    exterior: { style: 'cafe', bladeSide: 1 },
    staff: { name: 'Miles', role: 'barista' },
    activity: { station: { x: -4.55, z: 4.4, rot: Math.PI / 2 }, label: 'Espresso bar' },
    customerSpots: [
      [-1.4, 2.8],
      [1.4, 3.1],
      [-1.5, 5.4],
      [1.5, 5.7],
      [0, 6.9]
    ],
    offers: [
      {
        id: 'espresso',
        label: 'Espresso boost',
        cost: 6,
        dailyLimit: 2,
        description: 'Sprint speed +35% for 60 seconds.',
        effect: { type: 'boost', multiplier: 1.35, seconds: 60 }
      },
      {
        id: 'coffee_box',
        label: 'Buy coffee beans',
        cost: 20,
        dailyLimit: 1,
        description: 'Requires the Coffee License. A coffee box is delivered outside.',
        requiresLicense: 'coffee',
        effect: { type: 'box', product: 'coffee', qty: 6 }
      },
      {
        id: 'pastry_box',
        label: 'Buy pastry tray',
        cost: 14,
        dailyLimit: 1,
        description: 'A box of six bread items for the bakery aisle.',
        effect: { type: 'box', product: 'bread', qty: 6 }
      }
    ]
  },
  pharmacy: {
    id: 'pharmacy',
    name: 'Green Cross Pharmacy',
    shortName: 'PHARMACY',
    tagline: 'Everyday health, vitamins and a friendly prescription desk.',
    color: 0x3f9fbf,
    accent: 0x145063,
    trim: 0xffffff,
    facade: 0xe9f3f0,
    awning: 0x2f8fa6,
    signColor: '#0d4553',
    signText: '#effcff',
    glow: 0x58e6a4,
    building: shopBuilding(0),
    entrance: { x: 0, z: 36.2 },
    counter: { x: 0, z: 44.1, rot: 0 },
    keeper: { x: 0, z: 45.25 },
    door: { width: 2.8 },
    exterior: { style: 'pharmacy', bladeSide: 1 },
    staff: { name: 'Ada', role: 'pharmacist' },
    activity: { station: { x: 4.55, z: 4.6, rot: -Math.PI / 2 }, label: 'Prescription desk' },
    customerSpots: [
      [-1.4, 2.8],
      [1.4, 3.1],
      [-1.5, 5.4],
      [1.5, 5.7],
      [0, 6.9]
    ],
    offers: [
      {
        id: 'vitamins',
        label: 'Buy vitamins',
        cost: 15,
        dailyLimit: 1,
        description: 'A wellness boost: +0.25 store reputation.',
        effect: { type: 'reputation', amount: 0.25 }
      },
      {
        id: 'energy_drink',
        label: 'Energy drink',
        cost: 8,
        dailyLimit: 2,
        description: 'Sprint speed +50% for 90 seconds.',
        effect: { type: 'boost', multiplier: 1.5, seconds: 90 }
      },
      {
        id: 'water_case',
        label: 'Case of water',
        cost: 12,
        dailyLimit: 1,
        description: 'A box of six water bottles delivered outside.',
        effect: { type: 'box', product: 'water', qty: 6 }
      }
    ]
  },
  clothing: {
    id: 'clothing',
    name: 'Thread & Co.',
    shortName: 'CLOTHING',
    tagline: 'Everyday outfits, careful tailoring and a good mirror.',
    color: 0x2b3a5c,
    accent: 0xc9a86a,
    trim: 0xe8dcc2,
    facade: 0x222b42,
    awning: 0xe7dcc4,
    signColor: '#111827',
    signText: '#f0dfb8',
    glow: 0xf4d68f,
    building: shopBuilding(14),
    entrance: { x: 14, z: 36.2 },
    counter: { x: 14, z: 44.1, rot: 0 },
    keeper: { x: 14, z: 45.25 },
    door: { width: 2.8 },
    exterior: { style: 'clothing', bladeSide: 1 },
    staff: { name: 'Ines', role: 'clerk' },
    activity: { station: { x: 4.5, z: 3.3, rot: -Math.PI / 2 }, label: 'Tailor table' },
    customerSpots: [
      [-1.4, 2.8],
      [1.4, 3.1],
      [-1.5, 5.4],
      [1.5, 5.7],
      [0, 6.9]
    ],
    offers: [
      {
        id: 'style_session',
        label: 'Wardrobe consultation',
        cost: 18,
        dailyLimit: 1,
        description: 'A sharp new look: +0.20 store reputation.',
        effect: { type: 'reputation', amount: 0.2 }
      },
      {
        id: 'snack_gift',
        label: 'Gift with purchase',
        cost: 14,
        dailyLimit: 1,
        description: 'A box of snacks delivered to your store entrance.',
        effect: { type: 'box', product: 'snacks', qty: 6 }
      }
    ]
  },
  electronics: {
    id: 'electronics',
    name: 'Volt Electronics',
    shortName: 'ELECTRONICS',
    tagline: 'Gadgets, repairs and a wall of very bright screens.',
    color: 0x21c9d6,
    accent: 0x141a20,
    trim: 0x2de2ee,
    facade: 0x1c2127,
    awning: 0x10161b,
    signColor: '#070b0f',
    signText: '#c9fbff',
    glow: 0x36f0ff,
    building: shopBuilding(28),
    entrance: { x: 28, z: 36.2 },
    counter: { x: 28, z: 44.1, rot: 0 },
    keeper: { x: 28, z: 45.25 },
    door: { width: 2.8 },
    exterior: { style: 'electronics', bladeSide: 1 },
    staff: { name: 'Theo', role: 'technician' },
    activity: { station: { x: -4.55, z: 3.4, rot: Math.PI / 2 }, label: 'Repair bench' },
    customerSpots: [
      [-1.4, 2.8],
      [1.4, 3.1],
      [-1.5, 5.4],
      [1.5, 5.7],
      [0, 6.9]
    ],
    offers: [
      {
        id: 'power_bank',
        label: 'USB power bank',
        cost: 16,
        dailyLimit: 1,
        description: 'A charged battery for the road: sprint +30% for 90 seconds.',
        effect: { type: 'boost', multiplier: 1.3, seconds: 90 }
      },
      {
        id: 'store_radio',
        label: 'Store PA radio',
        cost: 30,
        dailyLimit: 1,
        description: 'Music for the aisles: +0.20 store reputation.',
        effect: { type: 'reputation', amount: 0.2 }
      }
    ]
  }
};

export const BUSINESS_LIST = Object.values(BUSINESSES);

export function businessById(id) {
  return BUSINESSES[id] || null;
}

export function businessDailyState(state, businessId) {
  const root = state.businesses;
  if (!root || typeof root !== 'object') return {};
  const offers = root.offers && typeof root.offers === 'object' ? root.offers : {};
  const entry = offers[businessId];
  return entry && typeof entry === 'object' ? entry : {};
}

export function offersUsedToday(state, businessId, offerId) {
  const used = businessDailyState(state, businessId)[offerId];
  return Number.isFinite(used) ? Math.max(0, Math.floor(used)) : 0;
}

export function shiftsServedToday(state, businessId) {
  const root = state.businesses;
  const activities =
    root && root.activities && typeof root.activities === 'object' ? root.activities : {};
  const used = activities[businessId];
  return Number.isFinite(used) ? Math.max(0, Math.floor(used)) : 0;
}

export function canUseOffer(game, business, offer) {
  if (!game || !business || !offer) return { ok: false, reason: 'Unavailable' };
  const state = game.state;
  const used = offersUsedToday(state, business.id, offer.id);
  if (used >= (offer.dailyLimit || 1)) return { ok: false, reason: 'Already used today' };
  if (state.cash < (offer.cost || 0)) return { ok: false, reason: 'Not enough cash' };
  if (offer.requiresLicense && !(state.licenses || []).includes(offer.requiresLicense)) {
    return { ok: false, reason: 'Requires the Coffee License' };
  }
  if (offer.requiresStock) {
    const total = (game.runtime?.shelves || [])
      .filter((s) => s.productId === offer.requiresStock.product)
      .reduce((n, s) => n + (s.stock || 0), 0);
    if (total < offer.requiresStock.qty) {
      return { ok: false, reason: 'Not enough stock on the shelves' };
    }
  }
  return { ok: true };
}
