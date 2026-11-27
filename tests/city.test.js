import test from 'node:test';
import assert from 'node:assert/strict';
import { NavGrid } from '../src/systems/Navigation.js';
import {
  ACCESSIBLE_BAYS,
  BUILDING_PLACEMENTS,
  BUS_ROUTES,
  CAR_ROUTES,
  CITY_BOUNDS,
  CITY_DESTINATIONS,
  CITY_PARK,
  CROSSINGS,
  CROSS_STREETS,
  INTERSECTIONS,
  MAIN_STREET,
  PARKING_LOT,
  PLAZA,
  POCKET_PARK,
  SIDEWALKS,
  crossingAt,
  isWalkableGround,
  pedestriansMayCross,
  stopLineFor,
  trafficPhase
} from '../src/data/city.js';

function overlap(a, b) {
  const w = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
  const d = Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ);
  return w > 0.001 && d > 0.001;
}

test('sidewalks never cover the cross-street asphalt', () => {
  for (const sw of SIDEWALKS) {
    for (const cs of CROSS_STREETS) {
      assert.equal(
        overlap(sw, { minX: cs.minX, maxX: cs.maxX, minZ: cs.minZ, maxZ: cs.maxZ }),
        false,
        `sidewalk ${JSON.stringify(sw)} covers cross street ${cs.id}`
      );
    }
  }
});

test('every intersection has four crossings, one per arm', () => {
  for (const it of INTERSECTIONS) {
    const own = CROSSINGS.filter((c) => c.id.startsWith(`${it.id}-`));
    assert.equal(own.length, 4, `intersection ${it.id} should have 4 crossings`);
    for (const c of own) {
      assert.ok(isWalkableGround((c.minX + c.maxX) / 2, (c.minZ + c.maxZ) / 2));
      if (c.axis === 'x') {
        // Crosses the north-south street: it must line up with that street.
        assert.ok(c.minX >= it.minX - 0.01 && c.maxX <= it.maxX + 0.01);
      } else {
        assert.ok(c.minZ >= it.minZ - 0.01 && c.maxZ <= it.maxZ + 0.01);
      }
      assert.equal(crossingAt((c.minX + c.maxX) / 2, (c.minZ + c.maxZ) / 2)?.id, c.id);
    }
  }
});

test('the walkable network links FRESH MART to every destination', () => {
  const step = 1;
  const minX = Math.ceil(CITY_BOUNDS.minX);
  const maxX = Math.floor(CITY_BOUNDS.maxX);
  const minZ = Math.ceil(CITY_BOUNDS.minZ);
  const maxZ = Math.floor(CITY_BOUNDS.maxZ);
  const key = (x, z) => z * 1000 + x;
  const startSpot = CITY_DESTINATIONS.find((d) => d.id === 'store');
  const start = { x: Math.round(startSpot.x), z: Math.round(startSpot.z) };
  assert.ok(isWalkableGround(start.x, start.z), 'store entrance must be walkable');

  const seen = new Set([key(start.x, start.z)]);
  const queue = [start];
  while (queue.length) {
    const { x, z } = queue.pop();
    for (const [dx, dz] of [
      [step, 0],
      [-step, 0],
      [0, step],
      [0, -step]
    ]) {
      const nx = x + dx;
      const nz = z + dz;
      if (nx < minX || nx > maxX || nz < minZ || nz > maxZ) continue;
      const k = key(nx, nz);
      if (seen.has(k) || !isWalkableGround(nx, nz)) continue;
      seen.add(k);
      queue.push({ x: nx, z: nz });
    }
  }

  for (const dest of CITY_DESTINATIONS) {
    assert.ok(
      seen.has(key(Math.round(dest.x), Math.round(dest.z))),
      `destination ${dest.id} is not connected to the supermarket`
    );
  }
});

test('buildings keep clear of roads, sidewalks, parks and the forecourt', () => {
  const reserved = [
    MAIN_STREET,
    ...CROSS_STREETS,
    ...SIDEWALKS,
    PLAZA,
    PARKING_LOT,
    CITY_PARK,
    POCKET_PARK
  ];
  for (const p of BUILDING_PLACEMENTS) {
    const footprint = {
      minX: p.x - p.w / 2,
      maxX: p.x + p.w / 2,
      minZ: p.z - p.d / 2,
      maxZ: p.z + p.d / 2
    };
    for (const area of reserved) {
      assert.equal(
        overlap(footprint, area),
        false,
        `building at ${p.x},${p.z} overlaps a public area`
      );
    }
    assert.ok(footprint.minX > CITY_BOUNDS.minX && footprint.maxX < CITY_BOUNDS.maxX);
    assert.ok(footprint.minZ > CITY_BOUNDS.minZ && footprint.maxZ < CITY_BOUNDS.maxZ);
  }
});

test('bus and car routes stay in their lane and inside the city', () => {
  for (const route of [...CAR_ROUTES, ...BUS_ROUTES]) {
    if (route.axis === 'x') {
      assert.ok(route.lane > MAIN_STREET.minZ && route.lane < MAIN_STREET.maxZ);
    } else {
      const street = CROSS_STREETS.find((s) => route.lane > s.minX && route.lane < s.maxX);
      assert.ok(street, `route lane ${route.lane} is not on a cross street`);
    }
    // Routes start and finish off-screen so vehicles can wrap out of sight.
    const [lo, hi] =
      route.axis === 'x'
        ? [CITY_BOUNDS.minX - 12, CITY_BOUNDS.maxX + 12]
        : [CITY_BOUNDS.minZ - 12, CITY_BOUNDS.maxZ + 12];
    assert.ok(route.from >= lo && route.to <= hi, `route from ${route.from} to ${route.to}`);
    assert.ok(route.speed > 0);
    for (const stop of route.stops || []) {
      const lo = Math.min(route.from, route.to);
      const hi = Math.max(route.from, route.to);
      assert.ok(stop > lo && stop < hi, 'bus stop must be on its route');
    }
  }
});

test('stop lines sit before each intersection in the travel direction', () => {
  for (const route of [...CAR_ROUTES, ...BUS_ROUTES]) {
    for (const it of INTERSECTIONS) {
      const line = stopLineFor(route, it);
      if (route.axis === 'x') {
        if (route.direction > 0) assert.ok(line <= it.minX);
        else assert.ok(line >= it.maxX);
      } else if (route.direction > 0) {
        assert.ok(line <= it.minZ);
      } else {
        assert.ok(line >= it.maxZ);
      }
    }
  }
});

test('traffic phases alternate and the cycle repeats', () => {
  const seen = new Set();
  for (let t = 0; t < 25; t += 0.25) {
    const phase = trafficPhase(t);
    seen.add(`${phase.ns}/${phase.ew}`);
  }
  for (const state of ['green/red', 'yellow/red', 'red/red', 'red/green', 'red/yellow']) {
    assert.ok(seen.has(state), `cycle never reaches ${state}`);
  }
  for (let t = 0; t < 30; t += 0.5) {
    const a = trafficPhase(t);
    const b = trafficPhase(t + 25);
    assert.deepEqual(a, b);
  }
  // Walk signals may only show while the conflicting traffic is stopped.
  for (const c of CROSSINGS) {
    for (let t = 0; t < 25; t += 0.5) {
      const phase = trafficPhase(t);
      const expected = c.axis === 'x' ? phase.ns === 'red' : phase.ew === 'red';
      assert.equal(pedestriansMayCross(c, t), expected);
    }
  }
  assert.equal(trafficPhase(9).ns, 'yellow');
  assert.equal(trafficPhase(0).ew, 'red');
});

test('nav grid blocks only cells that really overlap an obstacle', () => {
  // One 1x1 obstacle in the middle of a 10x10 grid with 1m cells.
  const nav = new NavGrid({
    minX: 0,
    maxX: 10,
    minZ: 0,
    maxZ: 10,
    cell: 1,
    radius: 0.36,
    obstacles: [{ minX: 4, maxX: 5, minZ: 4, maxZ: 5 }]
  });
  const blockedAt = (x, z) => {
    const c = nav.toCell(x, z);
    return nav.blocked[nav.index(c.cx, c.cz)] === 1;
  };
  // Cells that only touch the inflated rectangle stay open; a rounded-up range
  // used to block them and seal narrow kerb corridors.
  assert.equal(blockedAt(2.5, 2.5), false);
  assert.equal(blockedAt(4.5, 2.5), false);
  assert.equal(blockedAt(3.5, 4.5), true);
  assert.equal(blockedAt(4.5, 4.5), true);
  // These two were blocked by the old rounded-up range even though they are
  // clear of the inflated obstacle.
  assert.equal(blockedAt(6.5, 4.5), false);
  assert.equal(blockedAt(4.5, 6.5), false);
});

test('accessible bays and the store forecourt sit at the landmark', () => {
  for (const bay of ACCESSIBLE_BAYS) {
    assert.ok(bay.x > PARKING_LOT.minX && bay.x < PARKING_LOT.maxX);
    assert.ok(bay.z > PARKING_LOT.minZ && bay.z < PARKING_LOT.maxZ);
  }
  assert.ok(PLAZA.minZ <= 13 && PLAZA.maxZ >= 20);
  assert.ok(PLAZA.minX < 0 && PLAZA.maxX > 0);
  assert.ok(isWalkableGround(0, 13));
  assert.ok(isWalkableGround(0, 19));
});
