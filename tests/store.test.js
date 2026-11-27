import test from 'node:test';
import assert from 'node:assert/strict';

import { SHELF_SPOTS, SHELF_ROTATIONS, maxSpots } from '../src/data/products.js';
import {
  DOOR_WIDTH,
  EXPANSIONS,
  MAX_STORE_LEVEL,
  STORE_BASE,
  expansionDoorway,
  insideStore,
  nextFreeSpot,
  shelfDataFromSpot,
  storeFloors,
  unlockedExpansions
} from '../src/data/build.js';
import { defaultState, migrate } from '../src/core/SaveSystem.js';

test('each store level unlocks four more shelf spots up to all 36', () => {
  const expected = [12, 16, 20, 24, 28, 32, 36];
  for (let level = 1; level <= MAX_STORE_LEVEL; level++) {
    assert.equal(maxSpots(level), expected[level - 1]);
  }
  assert.equal(maxSpots(0), 12);
  assert.equal(maxSpots(99), SHELF_SPOTS.length);
  assert.equal(MAX_STORE_LEVEL, 7);
  assert.equal(EXPANSIONS.length, 6);
  assert.equal(SHELF_SPOTS.length, 36);
});

test('every unlocked shelf spot sits on an unlocked floor', () => {
  for (let level = 1; level <= MAX_STORE_LEVEL; level++) {
    const spots = maxSpots(level);
    for (let i = 0; i < spots; i++) {
      const [x, z] = SHELF_SPOTS[i];
      assert.ok(
        insideStore(x, z, level, 0.4),
        `spot ${i} (${x},${z}) is invalid at level ${level}`
      );
    }
  }
});

test('storeFloors grows by one room per level', () => {
  assert.deepEqual(storeFloors(1), [STORE_BASE]);
  for (let level = 1; level <= MAX_STORE_LEVEL; level++) {
    assert.equal(storeFloors(level).length, level);
    assert.equal(unlockedExpansions(level).length, level - 1);
  }
  assert.ok(insideStore(0, -16, 2));
  assert.ok(!insideStore(0, -16, 1));
  assert.ok(insideStore(16, 0, 3));
  assert.ok(!insideStore(16, 0, 2));
  assert.ok(insideStore(-24, 0, 7));
  assert.ok(!insideStore(-24, 0, 6));
});

test('every expansion has a doorway that opens into both rooms', () => {
  for (const e of EXPANSIONS) {
    const door = expansionDoorway(e);
    assert.ok(door, `${e.id} has no doorway`);
    assert.equal(door.max - door.min, DOOR_WIDTH);

    const shared = storeFloors(e.level - 1).some((r) =>
      door.axis === 'x'
        ? Math.abs(r.maxZ - door.at) < 1e-9 || Math.abs(r.minZ - door.at) < 1e-9
        : Math.abs(r.maxX - door.at) < 1e-9 || Math.abs(r.minX - door.at) < 1e-9
    );
    assert.ok(shared, `${e.id} doorway is not on an existing wall`);

    const mid = (door.min + door.max) / 2;
    const x = door.axis === 'x' ? mid : door.at;
    const z = door.axis === 'x' ? door.at : mid;
    const nx = door.axis === 'x' ? 0 : 0.1;
    const nz = door.axis === 'x' ? 0.1 : 0;
    assert.ok(insideStore(x + nx, z + nz, e.level), `${e.id} doorway misses the new room`);
    assert.ok(insideStore(x - nx, z - nz, e.level), `${e.id} doorway misses the old store`);
  }
});

test('nextFreeSpot never hands out a locked spot', () => {
  for (let level = 1; level <= MAX_STORE_LEVEL; level++) {
    const limit = maxSpots(level);
    const shelves = [];
    for (let i = 0; i < limit; i++) {
      const spot = nextFreeSpot(level, shelves);
      assert.ok(spot >= 0 && spot < limit, `level ${level} returned spot ${spot}`);
      shelves.push({ spot });
    }
    assert.equal(nextFreeSpot(level, shelves), -1, `level ${level} should be full`);

    // Shelves occupying locked spots must not hide the open ones.
    const locked = [];
    for (let i = limit; i < SHELF_SPOTS.length; i++) locked.push({ spot: i });
    assert.equal(nextFreeSpot(level, locked), 0);
  }
});

test('shelfDataFromSpot keeps the preset coordinates and rotation', () => {
  for (let spot = 0; spot < SHELF_SPOTS.length; spot++) {
    const sh = shelfDataFromSpot(spot, 'milk', { stock: 3, fridge: true });
    assert.equal(sh.spot, spot);
    assert.equal(sh.x, SHELF_SPOTS[spot][0]);
    assert.equal(sh.z, SHELF_SPOTS[spot][1]);
    assert.equal(sh.rot, SHELF_ROTATIONS[spot] || 0);
    assert.equal(sh.stock, 3);
    assert.equal(sh.fridge, true);
    assert.equal(sh.freezer, false);
    assert.equal(sh.capacity, 12);
  }
});

test('starting shelves fit on the base floor', () => {
  const s = defaultState();
  for (const sh of s.shelves) {
    assert.ok(insideStore(sh.x, sh.z, 1, 0.2));
    assert.ok(sh.spot < maxSpots(1));
  }
});

test('migrate clamps the store level to the expansion cap', () => {
  const s = defaultState();
  s.level = 9;
  assert.equal(migrate(s).level, MAX_STORE_LEVEL);
  s.level = 0.5;
  assert.equal(migrate(s).level, 1);
});

test('a level 2 save keeps its level and stockroom shelves after migration', () => {
  const s = defaultState();
  s.level = 2;
  s.cash = 900;
  s.shelves.push(shelfDataFromSpot(12, 'milk', { stock: 4 }));
  const loaded = migrate(JSON.parse(JSON.stringify(s)));
  assert.equal(loaded.level, 2);
  assert.equal(loaded.cash, 900);
  const shelf = loaded.shelves.find((x) => x.spot === 12);
  assert.ok(shelf, 'stockroom shelf was dropped on load');
  assert.equal(shelf.x, -6);
  assert.equal(shelf.z, -16);
});
