import { RECYCLE_BONUS } from '../data/products.js';

// Persistent milestones. Each test receives lifetime totals computed from
// completed days plus the current day's runtime stats.
export const ACHIEVEMENTS = [
  {
    id: 'first_day',
    icon: '🌅',
    name: 'Open for Business',
    desc: 'Finish your first day',
    test: (c) => c.days >= 1
  },
  {
    id: 'cash_1000',
    icon: '💵',
    name: 'Thousand Bucks',
    desc: 'Hold $1,000 in cash',
    test: (c) => c.cash >= 1000
  },
  {
    id: 'stars_5',
    icon: '⭐',
    name: 'Five-Star Store',
    desc: 'Reach a 5-star reputation',
    test: (c) => c.rep >= 5
  },
  {
    id: 'happy_50',
    icon: '😊',
    name: 'Crowd Pleaser',
    desc: 'Serve 50 happy customers in total',
    test: (c) => c.happy >= 50
  },
  {
    id: 'recycle_20',
    icon: '♻',
    name: 'Green Market',
    desc: 'Recycle 20 empty boxes',
    test: (c) => c.recycled >= 20
  },
  {
    id: 'licenses_4',
    icon: '📜',
    name: 'Wide Selection',
    desc: 'Own 4 product licenses',
    test: (c) => c.licenses >= 4
  },
  {
    id: 'perfect_day',
    icon: '🏆',
    name: 'Flawless Day',
    desc: 'Close a day with 5+ happy and 0 angry',
    test: (c) => !!c.perfectDay
  }
];

export const ACHIEVEMENT_IDS = new Set(ACHIEVEMENTS.map((a) => a.id));

function totals(state, stats) {
  const history = Array.isArray(state.history) ? state.history : [];
  const rows = stats ? [...history, stats] : history;
  const sum = (key) => rows.reduce((n, r) => n + (Number(r?.[key]) || 0), 0);
  return {
    days: history.length,
    cash: Number(state.cash) || 0,
    rep: Number(state.reputation) || 0,
    licenses: Array.isArray(state.licenses) ? state.licenses.length : 0,
    happy: sum('happy'),
    recycled: Math.round(sum('recycle') / RECYCLE_BONUS)
  };
}

// Mutates state.achievements and returns only the definitions earned now.
export function checkAchievements(state, stats = null, closedDay = null) {
  if (!Array.isArray(state.achievements)) state.achievements = [];
  const c = totals(state, stats);
  c.perfectDay = !!(closedDay && (closedDay.happy || 0) >= 5 && (closedDay.angry || 0) === 0);

  const earned = [];
  for (const a of ACHIEVEMENTS) {
    if (state.achievements.includes(a.id)) continue;
    let ok;
    try {
      ok = !!a.test(c);
    } catch {
      ok = false;
    }
    if (ok) {
      state.achievements.push(a.id);
      earned.push(a);
    }
  }
  return earned;
}
