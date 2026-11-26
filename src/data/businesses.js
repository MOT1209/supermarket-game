// Functional neighbours across Main Street. Every business has a physical
// interior, a counter the player can interact with, and offers that change the
// supermarket simulation (stock, cash, reputation or a temporary speed boost).

export const BUSINESSES = {
  bakery: {
    id: 'bakery',
    name: 'Sunrise Bakery',
    shortName: 'BAKERY',
    tagline: 'Fresh loaves, warm pastries, early mornings.',
    color: 0xe0a03a,
    accent: 0x7a4a1f,
    signColor: '#8a4a12',
    awning: 0xd99a3a,
    building: { minX: -29, maxX: -15, minZ: 36, maxZ: 48 },
    entrance: { x: -22, z: 36.2 },
    counter: { x: -22, z: 44.2, rot: 0 },
    keeper: { x: -22, z: 45.4 },
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
    accent: 0x1d4a35,
    signColor: '#1d4a35',
    awning: 0x3f7d5a,
    building: { minX: -7, maxX: 7, minZ: 36, maxZ: 48 },
    entrance: { x: 0, z: 36.2 },
    counter: { x: 0, z: 44.2, rot: 0 },
    keeper: { x: 0, z: 45.4 },
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
    tagline: 'Everyday health, vitamins and cold drinks.',
    color: 0x4f9fbf,
    accent: 0x1d4a5c,
    signColor: '#1d4a5c',
    awning: 0x3f8fae,
    building: { minX: 15, maxX: 29, minZ: 36, maxZ: 48 },
    entrance: { x: 22, z: 36.2 },
    counter: { x: 22, z: 44.2, rot: 0 },
    keeper: { x: 22, z: 45.4 },
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
