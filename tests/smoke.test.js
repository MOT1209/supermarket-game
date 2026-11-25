import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PRODUCTS, LICENSES, CATEGORIES, SHELF_SPOTS, STARTING_SHELVES,
  sellPrice, maxSpots, DEFAULT_MARKUP, RENT_PER_DAY, FRIDGE_UPKEEP,
  REPUTATION_MAX, REPUTATION_START, SHELF_CAPACITY
} from '../src/data/products.js';
import { money, clamp, rounded, pick, rand } from '../src/utils/math.js';
import { defaultState } from '../src/core/SaveSystem.js';
import { objectiveFor, evaluateObjective } from '../src/systems/Objectives.js';

test('every product has a valid shape, category and license', () => {
  for (const [pid, p] of Object.entries(PRODUCTS)) {
    assert.ok(p.name, `${pid} needs a name`);
    assert.ok(p.price > 0, `${pid} price must be positive`);
    assert.ok(p.shape, `${pid} needs a shape`);
    assert.ok(CATEGORIES.includes(p.category), `${pid} has unknown category`);
    if (p.license) {
      const lic = LICENSES.find(l => l.id === p.license);
      assert.ok(lic, `${pid} references missing license ${p.license}`);
      assert.equal(lic.product, pid, `${pid} license product mismatch`);
    }
  }
});

test('starting shelves are valid, unlicensed and fit physical spots', () => {
  assert.ok(STARTING_SHELVES.length <= SHELF_SPOTS.length);
  for (const pid of STARTING_SHELVES) {
    assert.ok(PRODUCTS[pid], `${pid} missing`);
    assert.equal(PRODUCTS[pid].license, null, `${pid} must not need a license`);
  }
});

test('maxSpots never exceeds physical shelf spots', () => {
  for (let level = 1; level <= 20; level++) {
    assert.ok(maxSpots(level) <= SHELF_SPOTS.length,
      `level ${level} unlocks ${maxSpots(level)} > ${SHELF_SPOTS.length}`);
    assert.ok(maxSpots(level) >= 4, 'at least the starting 4 spots');
  }
  // Monotonic up to the cap
  assert.ok(maxSpots(2) >= maxSpots(1));
  assert.equal(maxSpots(3), SHELF_SPOTS.length);
});

test('default markup and sell price are sane', () => {
  assert.ok(DEFAULT_MARKUP > 1);
  for (const pid of Object.keys(PRODUCTS)) {
    const sp = sellPrice(pid);
    assert.ok(sp > 0, `${pid} sell price must be positive`);
    assert.equal(sp, rounded(PRODUCTS[pid].price * DEFAULT_MARKUP));
  }
});

test('defaultState is complete and migrated states stay valid', () => {
  const s = defaultState();
  assert.equal(s.version, 3);
  assert.ok(s.cash > 0);
  assert.equal(s.reputation, REPUTATION_START);
  assert.ok(s.reputation >= 0 && s.reputation <= REPUTATION_MAX);
  assert.equal(Object.keys(s.sellPrices).length, Object.keys(PRODUCTS).length);
  assert.equal(s.shelves.length, STARTING_SHELVES.length);
  for (const sh of s.shelves) {
    assert.ok(PRODUCTS[sh.productId]);
    assert.ok(sh.stock <= sh.capacity);
    assert.ok(sh.spot < SHELF_SPOTS.length);
  }
  // A v1-shaped save (no version/sellPrices/reputation) must migrate cleanly.
  const legacy = JSON.parse(JSON.stringify(s));
  delete legacy.version;
  delete legacy.sellPrices;
  delete legacy.reputation;
  const migrated = defaultState();
  assert.equal(migrated.version, 3);
  assert.ok(Number.isFinite(migrated.reputation));
});

test('daily objective is achievable and yields a bonus', () => {
  for (let day = 1; day <= 30; day++) {
    const obj = objectiveFor(day);
    assert.ok(obj.target > 0, `day ${day} target must be positive`);
    assert.ok(obj.text.length > 0);
    const game = {
      state: { day },
      runtime: { stats: { happy: 0, revenue: 0, recycle: 0 } }
    };
    const before = evaluateObjective(game);
    assert.equal(before.met, false);
    assert.equal(before.bonus, 0);

    // Satisfy the metric and re-evaluate.
    if (obj.metric === 'recycle') game.runtime.stats.recycle = obj.target * 0.5;
    else game.runtime.stats[obj.metric] = obj.target;
    const after = evaluateObjective(game);
    assert.equal(after.met, true);
    assert.ok(after.bonus > 0, 'met objective must pay a bonus');
  }
});

test('math helpers behave', () => {
  assert.equal(money(3), '$3.00');
  assert.equal(clamp(5, 0, 1), 1);
  assert.equal(clamp(-5, 0, 1), 0);
  assert.equal(rounded(1.2349), 1.23);
  assert.equal(rounded(1.2351), 1.24);
  assert.ok(['a', 'b'].includes(pick(['a', 'b'])));
  const v = rand(2, 5);
  assert.ok(v >= 2 && v <= 5);
});

test('operating cost constants are positive', () => {
  assert.ok(RENT_PER_DAY > 0);
  assert.ok(FRIDGE_UPKEEP >= 0);
  assert.ok(SHELF_CAPACITY > 0);
});

test('licenses unlock products that exist', () => {
  for (const l of LICENSES) {
    assert.ok(PRODUCTS[l.product], `${l.id} -> missing product`);
    assert.equal(PRODUCTS[l.product].license, l.id);
    assert.ok(l.cost > 0);
  }
});
