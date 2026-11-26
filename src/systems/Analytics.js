import { RECYCLE_BONUS } from '../data/products.js';
import { rounded } from '../utils/math.js';

const sum = (rows, key) => rows.reduce((n, r) => n + (Number(r?.[key]) || 0), 0);

// A completed day is persisted in state.history. During play we add a
// provisional row from runtime.stats so the dashboard reflects today so far.
export function dayRecord(state, stats, extra = {}) {
  return {
    day: state.day,
    revenue: rounded(stats.revenue || 0),
    stockCost: rounded(stats.stockCost || 0),
    recycle: rounded(stats.recycle || 0),
    happy: stats.happy || 0,
    angry: stats.angry || 0,
    ...extra
  };
}

export function buildAnalytics(state, stats = null, extra = {}) {
  const history = Array.isArray(state.history) ? state.history : [];
  const rows = stats ? [...history, dayRecord(state, stats, extra)] : [...history];

  const completed = history.filter((r) => Number.isFinite(r?.net));
  const best = rows
    .filter((r) => Number.isFinite(r?.net))
    .reduce((top, r) => (!top || r.net > top.net ? r : top), null);

  return {
    days: rows.length,
    revenue: rounded(sum(rows, 'revenue')),
    stockCost: rounded(sum(rows, 'stockCost')),
    recycle: rounded(sum(rows, 'recycle')),
    happy: sum(rows, 'happy'),
    angry: sum(rows, 'angry'),
    recycled: Math.round(sum(rows, 'recycle') / RECYCLE_BONUS),
    avgNet: completed.length ? rounded(sum(completed, 'net') / completed.length) : 0,
    bestDay: best ? { day: best.day, net: best.net } : null,
    last7: rows.slice(-7)
  };
}
