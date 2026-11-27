import { activityFor, activityRound, shuffleIndices } from '../data/shopActivities.js';
import { shiftsServedToday } from '../data/businesses.js';
import { rounded } from '../utils/math.js';

// One shared activity session per shop interaction. The UI owns timing and
// presentation; this system owns daily limits, scoring, rewards and persistence.
export default class ShopActivities {
  constructor(game) {
    this.game = game;
    this.session = null;
  }

  ensureRoot() {
    this.game.businessSystem?.ensureDay?.();
    const root = this.game.state.businesses;
    if (!root.activities || typeof root.activities !== 'object') root.activities = {};
    return root.activities;
  }

  servedToday(businessId) {
    return shiftsServedToday(this.game.state, businessId);
  }

  limit(businessId) {
    return activityFor(businessId)?.dailyLimit || 3;
  }

  remaining(businessId) {
    return Math.max(0, this.limit(businessId) - this.servedToday(businessId));
  }

  start(businessId) {
    const config = activityFor(businessId);
    if (!config) return { ok: false, reason: 'This station is not ready yet.' };
    this.ensureRoot();
    if (this.remaining(businessId) <= 0) {
      return {
        ok: false,
        reason: 'The staff are done with walk-ins for today. Come back tomorrow.'
      };
    }
    this.session = {
      businessId,
      config,
      roundIndex: 0,
      score: 0,
      maxScore: 0,
      results: [],
      order: config.type === 'choice' ? shuffleIndices(config.cases.length) : null,
      finished: false,
      summary: null
    };
    this.session.round = activityRound(config, 0, this.session.order);
    return { ok: true, session: this.session };
  }

  submit(quality) {
    const session = this.session;
    if (!session || session.finished) return { ok: false, reason: 'No active shift.' };
    const value = Math.max(0, Math.min(1, Number.isFinite(quality) ? quality : 0));
    session.score += value;
    session.maxScore += 1;
    session.results.push(value);
    session.roundIndex += 1;

    if (session.roundIndex >= session.config.rounds) {
      session.finished = true;
      const summary = this.settle();
      session.summary = summary;
      return { ok: true, finished: true, summary, session };
    }
    session.round = activityRound(session.config, session.roundIndex, session.order);
    return { ok: true, finished: false, session };
  }

  settle() {
    const session = this.session;
    if (!session || session.settled) return session?.summary || null;
    const config = session.config;
    const quality = session.score / Math.max(1, session.maxScore);
    const pay = Math.max(1, Math.round(config.pay * (0.4 + 0.6 * quality)));
    const rep = rounded(config.rep * (0.5 + quality) * 100) / 100;
    const state = this.game.state;
    state.cash = rounded(state.cash + pay);
    state.reputation = Math.min(5, rounded((state.reputation ?? 3) + rep));
    state.lifetimeRevenue = Math.max(0, (state.lifetimeRevenue || 0) + pay);
    this.game.runtime.stats.revenue += pay;

    const activities = this.ensureRoot();
    activities[session.businessId] = (activities[session.businessId] || 0) + 1;

    session.settled = true;
    this.game.ui.updateHUD();
    this.game.audio.play('coin');
    this.game.save();
    return {
      pay,
      rep,
      quality,
      score: session.score,
      maxScore: session.maxScore,
      served: activities[session.businessId],
      limit: config.dailyLimit
    };
  }

  cancel() {
    this.session = null;
  }
}
