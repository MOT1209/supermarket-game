import { BUSINESSES, canUseOffer } from '../data/businesses.js';
import { PRODUCTS } from '../data/products.js';
import { spawnOneBox } from './DeliverySystem.js';
import { rounded } from '../utils/math.js';
import { refreshShelfVisual } from '../world/ShelfFactory.js';

export default class BusinessSystem {
  constructor(game) {
    this.game = game;
  }

  ensureDay() {
    const s = this.game.state;
    if (!s.businesses || typeof s.businesses !== 'object') {
      s.businesses = { day: s.day, offers: { bakery: {}, cafe: {}, pharmacy: {} } };
    }
    if (s.businesses.day !== s.day) {
      s.businesses.day = s.day;
      s.businesses.offers = { bakery: {}, cafe: {}, pharmacy: {} };
    }
  }

  getOffers(businessId) {
    this.ensureDay();
    const b = BUSINESSES[businessId];
    if (!b) return [];
    return b.offers || [];
  }

  useOffer(businessId, offerId) {
    this.ensureDay();
    const b = BUSINESSES[businessId];
    if (!b) return false;
    const offer = (b.offers || []).find((o) => o.id === offerId);
    if (!offer) return false;
    const check = canUseOffer(this.game, b, offer);
    if (!check.ok) {
      this.game.ui.toast(check.reason || 'Cannot use offer');
      return false;
    }
    const s = this.game.state;
    if (!s.businesses.offers[businessId]) s.businesses.offers[businessId] = {};
    const used = s.businesses.offers[businessId][offerId] || 0;
    if (used >= (offer.dailyLimit || 1)) {
      this.game.ui.toast('Already used today');
      return false;
    }
    s.cash = rounded(s.cash - (offer.cost || 0));
    // apply effect
    const eff = offer.effect || {};
    if (eff.type === 'box' && eff.product) {
      spawnOneBox(this.game, eff.product);
      this.game.ui.toast(`Bought ${eff.qty || 6}x ${PRODUCTS[eff.product]?.name || eff.product}`);
    } else if (eff.type === 'reputation' && eff.amount) {
      s.reputation = Math.min(5, (s.reputation || 3) + eff.amount);
      this.game.ui.toast(`Reputation +${eff.amount}`);
    } else if (eff.type === 'boost') {
      // simple: just toast for now (no player boost system yet)
      this.game.ui.toast(`Boost applied: x${eff.multiplier || 1} for ${eff.seconds || 30}s`);
    } else if (eff.type === 'sell' && eff.product) {
      let remaining = eff.qty || 0;
      for (const sh of this.game.runtime.shelves) {
        if (sh.productId !== eff.product) continue;
        const take = Math.min(remaining, sh.stock);
        sh.stock -= take;
        remaining -= take;
      }
      if (remaining > 0) {
        this.game.ui.toast('Not enough stock to sell');
        s.cash += offer.cost || 0; // refund
        return false;
      }
      for (const sh of this.game.runtime.shelves) {
        if (sh.productId !== eff.product) continue;
        refreshShelfVisual(sh.spot, sh.group, sh, this.game);
      }
      this.game.syncShelfData?.();
      s.cash = rounded(s.cash + (eff.payout || 0));
      if (eff.reputation) s.reputation = Math.min(5, (s.reputation || 3) + eff.reputation);
      this.game.ui.toast(`Sold for $${eff.payout || 0}`);
    }
    s.businesses.offers[businessId][offerId] = used + 1;
    this.game.ui.updateHUD?.();
    this.game.save(true, true);
    return true;
  }
}
