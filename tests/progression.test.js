import test from 'node:test';
import assert from 'node:assert/strict';

import { defaultState, migrate } from '../src/core/SaveSystem.js';
import { buildAnalytics } from '../src/systems/Analytics.js';
import { ACHIEVEMENTS, checkAchievements } from '../src/systems/Achievements.js';

test('default state contains empty progression collections', () => {
  const s = defaultState();
  assert.deepEqual(s.achievements, []);
  assert.deepEqual(s.history, []);
});

test('migrate keeps valid progression data and drops invalid entries', () => {
  const s = defaultState();
  s.achievements = ['first_day', 'not_a_real_achievement', 'first_day'];
  s.history = [
    { day: 1, revenue: 100, net: 40, happy: 6, angry: 0 },
    { day: 'oops' },
    null
  ];
  const m = migrate(s);
  assert.deepEqual(m.achievements, ['first_day']);
  assert.equal(m.history.length, 1);
  assert.equal(m.history[0].day, 1);
});

test('analytics aggregates completed days with the current day', () => {
  const s = defaultState();
  s.history = [
    { day: 1, revenue: 200, stockCost: 60, recycle: 1, happy: 8, angry: 1, net: 120 },
    { day: 2, revenue: 300, stockCost: 90, recycle: 0, happy: 5, angry: 2, net: 180 }
  ];
  const stats = { revenue: 100, stockCost: 40, recycle: 2, happy: 4, angry: 0 };
  const a = buildAnalytics(s, stats);
  assert.equal(a.days, 3);
  assert.equal(a.revenue, 600);
  assert.equal(a.happy, 17);
  assert.equal(a.angry, 3);
  assert.equal(a.recycled, 6); // (1 + 0 + 2) boxes at 0.5 each
  assert.equal(a.avgNet, 150); // (120 + 180) / 2 completed days
  assert.deepEqual(a.bestDay, { day: 2, net: 180 });
  assert.equal(a.last7.length, 3);
});

test('analytics is safe with no history and no current stats', () => {
  const a = buildAnalytics(defaultState());
  assert.equal(a.days, 0);
  assert.equal(a.revenue, 0);
  assert.equal(a.avgNet, 0);
  assert.equal(a.bestDay, null);
  assert.deepEqual(a.last7, []);
});

test('achievements unlock once and only return newly earned ones', () => {
  const s = defaultState();
  s.cash = 1200;
  s.reputation = 5;
  s.licenses = ['coffee', 'cheese', 'juice', 'snacks'];
  s.history = [{ day: 1, happy: 30, angry: 0, recycle: 12, revenue: 100 }];
  const stats = { happy: 25, angry: 0, recycle: 2, revenue: 50 };
  const first = checkAchievements(s, stats);
  const ids = first.map(a => a.id);
  assert.ok(ids.includes('cash_1000'));
  assert.ok(ids.includes('stars_5'));
  assert.ok(ids.includes('happy_50'));
  assert.ok(ids.includes('recycle_20'));
  assert.ok(ids.includes('licenses_4'));
  const second = checkAchievements(s, stats);
  assert.deepEqual(second, []);
  assert.equal(new Set(s.achievements).size, s.achievements.length);
});

test('perfect-day achievement requires happy customers and zero angry', () => {
  const s = defaultState();
  assert.ok(!checkAchievements(s, null, { happy: 6, angry: 1 }).some(a => a.id === 'perfect_day'));
  assert.ok(!checkAchievements(s, null, { happy: 2, angry: 0 }).some(a => a.id === 'perfect_day'));
  const earned = checkAchievements(s, null, { happy: 6, angry: 0 });
  assert.ok(earned.some(a => a.id === 'perfect_day'));
  assert.ok(ACHIEVEMENTS.some(a => a.id === 'perfect_day'));
});
