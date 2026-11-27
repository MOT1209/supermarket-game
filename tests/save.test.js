import test from 'node:test';
import assert from 'node:assert/strict';

import { defaultState, migrate } from '../src/core/SaveSystem.js';
import { createDebouncedSave } from '../src/core/saveScheduler.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('migrate keeps valid fields from a current save', () => {
  const s = defaultState();
  s.cash = 1234.56;
  s.day = 9;
  s.level = 2;
  s.storeName = 'TEST MART';
  const migrated = migrate(s);
  assert.equal(migrated.cash, 1234.56);
  assert.equal(migrated.day, 9);
  assert.equal(migrated.level, 2);
  assert.equal(migrated.storeName, 'TEST MART');
});

test('migrate replaces corrupt numeric fields with safe defaults', () => {
  const s = defaultState();
  s.cash = 'lots';
  s.day = -4;
  s.level = 0;
  s.clock = null;
  s.lifetimeRevenue = 'n/a';
  const migrated = migrate(s);
  assert.equal(migrated.cash, 500);
  assert.equal(migrated.day, 1);
  assert.equal(migrated.level, 1);
  assert.equal(migrated.clock, 0);
  assert.equal(migrated.lifetimeRevenue, 0);
});

test('migrate clamps settings and rejects unknown graphics modes', () => {
  const s = defaultState();
  s.sensitivity = -1;
  s.volume = 12;
  s.graphics = 'ultra';
  s.reputation = 99;
  const migrated = migrate(s);
  assert.equal(migrated.sensitivity, 0.0008);
  assert.equal(migrated.volume, 1);
  assert.equal(migrated.graphics, 'high');
  assert.equal(migrated.reputation, 5);
});

test('migrate keeps only the two player models and three camera views', () => {
  const s = defaultState();
  assert.equal(s.playerModel, 'male');
  assert.equal(s.viewMode, 'first');
  s.playerModel = 'female';
  s.viewMode = 'third';
  const kept = migrate(s);
  assert.equal(kept.playerModel, 'female');
  assert.equal(kept.viewMode, 'third');
  s.viewMode = 'second';
  assert.equal(migrate(s).viewMode, 'shoulder');
  s.playerModel = 'robot';
  s.viewMode = 'orbit';
  const fixed = migrate(s);
  assert.equal(fixed.playerModel, 'male');
  assert.equal(fixed.viewMode, 'first');
});

test('debounced save coalesces bursts into one write', async () => {
  let writes = 0;
  const debounced = createDebouncedSave(() => {
    writes++;
  }, 20);
  debounced.schedule();
  debounced.schedule();
  debounced.schedule();
  assert.equal(writes, 0);
  await sleep(60);
  assert.equal(writes, 1);
});

test('debounced flush writes immediately and cancels the pending timer', async () => {
  let writes = 0;
  const debounced = createDebouncedSave(() => {
    writes++;
  }, 20);
  debounced.schedule();
  assert.equal(debounced.flush(), true);
  assert.equal(writes, 1);
  await sleep(60);
  assert.equal(writes, 1);
  assert.equal(debounced.flush(), false);
});

test('debounced cancel discards a pending write', async () => {
  let writes = 0;
  const debounced = createDebouncedSave(() => {
    writes++;
  }, 20);
  debounced.schedule();
  debounced.cancel();
  await sleep(60);
  assert.equal(writes, 0);
});
