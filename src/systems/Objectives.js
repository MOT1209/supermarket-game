// One rotating daily objective. Progress is read from runtime.stats, so no
// extra state is needed; the reward is paid at closing.

const CYCLE = [
  {
    metric: 'happy',
    unit: 'customers',
    make: (day) => 6 + day * 2,
    label: (n) => `Serve ${n} happy customers`
  },
  {
    metric: 'revenue',
    unit: '$',
    make: (day) => 200 + day * 60,
    label: (n) => `Earn $${Math.round(n)} in sales`
  },
  {
    metric: 'recycle',
    unit: 'boxes',
    make: (day) => 2 + Math.floor(day / 2),
    label: (n) => `Recycle ${n} empty boxes`
  }
];

export function objectiveFor(day) {
  const def = CYCLE[(day - 1) % CYCLE.length];
  const target = def.make(day);
  return {
    metric: def.metric,
    unit: def.unit,
    target,
    text: def.label(target),
    // recycle is tracked in dollars (RECYCLE_BONUS each), convert to boxes
    value: (stats) =>
      def.metric === 'recycle' ? Math.round((stats.recycle || 0) / 0.5) : stats[def.metric] || 0
  };
}

export function objectiveBonus(obj) {
  return 50 + Math.round(obj.target * 0.5);
}

export function evaluateObjective(game) {
  const obj = objectiveFor(game.state.day);
  const progress = obj.value(game.runtime.stats);
  const met = progress >= obj.target;
  return { obj, progress, met, bonus: met ? objectiveBonus(obj) : 0 };
}
