// Static layout for the explorable city around FRESH MART.
//
// Coordinates match the supermarket: its entrance faces +Z, Main Street runs
// east-west in front of it, and the three functional neighbours face south
// across the far sidewalk. Keeping this data separate makes the layout easy to
// test and lets CityWorld build procedural fallbacks for every Blender asset.

export const CITY_BOUNDS = Object.freeze({ minX: -78, maxX: 78, minZ: -40, maxZ: 68 });

export const MAIN_STREET = Object.freeze({
  minX: -80,
  maxX: 80,
  minZ: 20,
  maxZ: 30,
  centerZ: 25,
  eastLaneZ: 22.5,
  westLaneZ: 27.5
});

export const CROSS_STREETS = Object.freeze([
  { id: 'west', minX: -44, maxX: -36, minZ: -40, maxZ: 68, northLaneX: -42, southLaneX: -38 },
  { id: 'east', minX: 36, maxX: 44, minZ: -40, maxZ: 68, northLaneX: 38, southLaneX: 42 }
]);

// Sidewalk bands stop where a cross street passes through, so the asphalt and
// the crossings stay visible instead of being covered by pavement.
export const SIDEWALKS = Object.freeze([
  { minX: -80, maxX: -44, minZ: 14, maxZ: 20 },
  { minX: -36, maxX: 36, minZ: 14, maxZ: 20 },
  { minX: 44, maxX: 80, minZ: 14, maxZ: 20 },
  { minX: -80, maxX: -44, minZ: 30, maxZ: 36 },
  { minX: -36, maxX: 36, minZ: 30, maxZ: 36 },
  { minX: 44, maxX: 80, minZ: 30, maxZ: 36 },
  { minX: -48, maxX: -44, minZ: -40, maxZ: 14 },
  { minX: -36, maxX: -32, minZ: -40, maxZ: 14 },
  { minX: -48, maxX: -44, minZ: 36, maxZ: 68 },
  { minX: -36, maxX: -32, minZ: 36, maxZ: 68 },
  { minX: 32, maxX: 36, minZ: -40, maxZ: 14 },
  { minX: 44, maxX: 48, minZ: -40, maxZ: 14 },
  { minX: 32, maxX: 36, minZ: 36, maxZ: 68 },
  { minX: 44, maxX: 48, minZ: 36, maxZ: 68 }
]);

export const PARKING_LOT = Object.freeze({ minX: -31, maxX: -18, minZ: -8, maxZ: 12 });
export const CITY_PARK = Object.freeze({ minX: 18, maxX: 31, minZ: -8, maxZ: 12 });

export const SHOP_SHELLS = Object.freeze([
  { id: 'bakery', file: 'city/shop_shell.glb', x: -28, z: 42, rot: Math.PI },
  { id: 'cafe', file: 'city/shop_shell.glb', x: -14, z: 42, rot: Math.PI },
  { id: 'pharmacy', file: 'city/shop_shell.glb', x: 0, z: 42, rot: Math.PI },
  { id: 'clothing', file: 'city/shop_shell.glb', x: 14, z: 42, rot: Math.PI },
  { id: 'electronics', file: 'city/shop_shell.glb', x: 28, z: 42, rot: Math.PI }
]);

// North-row buildings are rotated to face south (-Z); south-row buildings face
// north (+Z). The front of every Blender building is local +Z.
export const BUILDING_PLACEMENTS = Object.freeze([
  {
    file: 'city/building_residential_a.glb',
    x: -58,
    z: 56,
    rot: Math.PI,
    w: 10,
    d: 12,
    h: 16,
    color: 0xd1bd98
  },
  {
    file: 'city/building_commercial_a.glb',
    x: -20,
    z: 56,
    rot: Math.PI,
    w: 12,
    d: 10,
    h: 10,
    color: 0x808c93
  },
  {
    file: 'city/building_residential_c.glb',
    x: 14,
    z: 57,
    rot: Math.PI,
    w: 12,
    d: 11,
    h: 19,
    color: 0x9eaab0
  },
  {
    file: 'city/building_commercial_b.glb',
    x: 58,
    z: 56,
    rot: Math.PI,
    w: 10,
    d: 10,
    h: 13,
    color: 0x616f78
  },
  {
    file: 'city/building_residential_b.glb',
    x: -60,
    z: 4,
    rot: 0,
    w: 8,
    d: 10,
    h: 12,
    color: 0xa35745
  },
  {
    file: 'city/building_commercial_b.glb',
    x: 56,
    z: 4,
    rot: 0,
    w: 10,
    d: 10,
    h: 13,
    color: 0x616f78
  },
  {
    file: 'city/building_residential_a.glb',
    x: 70,
    z: 2,
    rot: 0,
    w: 10,
    d: 12,
    h: 16,
    color: 0xd1bd98
  },
  {
    file: 'city/building_commercial_a.glb',
    x: -70,
    z: 0,
    rot: 0,
    w: 12,
    d: 10,
    h: 10,
    color: 0x808c93
  },
  // Office blocks and taller residential towers close the southern skyline.
  {
    file: 'city/building_office_a.glb',
    x: -58,
    z: -22,
    rot: 0,
    w: 12,
    d: 10,
    h: 24,
    color: 0x7d8b94,
    kind: 'office',
    lodFar: 120
  },
  {
    file: 'city/building_office_a.glb',
    x: 56,
    z: -14,
    rot: 0,
    w: 12,
    d: 10,
    h: 20,
    color: 0x6f7d86,
    kind: 'office',
    lodFar: 120
  },
  {
    file: 'city/building_residential_d.glb',
    x: 58,
    z: -32,
    rot: 0,
    w: 12,
    d: 10,
    h: 16,
    color: 0xb9987a,
    lodFar: 110
  },
  {
    file: 'city/building_residential_d.glb',
    x: -56,
    z: -34,
    rot: 0,
    w: 12,
    d: 10,
    h: 18,
    color: 0xa88a72,
    lodFar: 110
  }
]);

// Decorative props. Colliders are only added for objects a player could
// reasonably bump into; small markings are left walkable.
export const STREETLIGHTS = Object.freeze([
  [-72, 18.4, 0],
  [-56, 18.4, 0],
  [-24, 18.4, 0],
  [-8, 18.4, 0],
  [8, 18.4, 0],
  [24, 18.4, 0],
  [-45.8, -30, Math.PI / 2],
  [-45.8, -14, Math.PI / 2],
  [-34.2, -30, -Math.PI / 2],
  [-34.2, -14, -Math.PI / 2],
  [45.8, -30, -Math.PI / 2],
  [45.8, -14, -Math.PI / 2],
  [34.2, -30, Math.PI / 2],
  [34.2, -14, Math.PI / 2],
  [56, 18.4, 0],
  [72, 18.4, 0],
  [-64, 31.6, Math.PI],
  [-48, 31.6, Math.PI],
  [48, 31.6, Math.PI],
  [64, 31.6, Math.PI]
]);

export const TREES = Object.freeze([
  [-74, 16.6, 1.1],
  [-50, 16.6, 0.9],
  [-30, 16.6, 1.05],
  [-14, 16.6, 0.95],
  [14, 16.6, 1.0],
  [30, 16.6, 1.1],
  [50, 16.6, 0.92],
  [74, 16.6, 1.04],
  [-70, 33.4, 1.0],
  [-50, 33.4, 1.12],
  [-30, 33.4, 0.94],
  [50, 33.4, 1.08],
  [70, 33.4, 0.96],
  [22, 10, 1.15],
  [32, 10, 0.98],
  [22, -4, 1.02],
  [32, -4, 1.08],
  [-36, 9, 0.95],
  [-24, -4, 1.06],
  [-72, -11, 1.02],
  [-69, -18, 1.12],
  [-73, -20, 0.92]
]);

export const BENCHES = Object.freeze([
  [-34, 17.2, 0],
  [-6, 17.2, 0],
  [18, 17.2, 0],
  [54, 17.2, 0],
  [-48, 32.8, Math.PI],
  [48, 32.8, Math.PI],
  [26, 2, Math.PI / 2],
  [28, -2, Math.PI / 2]
]);

export const PLANTERS = Object.freeze([
  [-19, 17.4],
  [-11, 17.4],
  [11, 17.4],
  [19, 17.4],
  [-35.4, 34.6],
  [35.4, 34.6],
  [20, 12],
  [34, 12]
]);

export const BINS = Object.freeze([
  [-16, 18.4],
  [16, 18.4],
  [-21, 34.2],
  [21, 34.2],
  [34, 6]
]);

export const HYDRANTS = Object.freeze([
  [-46, 19.2],
  [46, 19.2],
  [-33, 34.4],
  [33, 34.4]
]);

export const PARKED_CARS = Object.freeze([
  { file: 'city/car_red.glb', x: -29, z: 9, rot: Math.PI / 2 },
  { file: 'city/car_blue.glb', x: -29, z: 4.5, rot: Math.PI / 2 },
  { file: 'city/car_white.glb', x: -29, z: 0, rot: Math.PI / 2 },
  { file: 'city/taxi.glb', x: -29, z: -4, rot: Math.PI / 2 },
  { file: 'city/van.glb', x: -24, z: -4, rot: -Math.PI / 2 }
]);

export const PEDESTRIAN_ROUTES = Object.freeze([
  [
    { x: -70, z: 18.8 },
    { x: -46, z: 18.8 },
    { x: -40, z: 18.8 },
    { x: -34, z: 18.8 },
    { x: 0, z: 18.8 },
    { x: 34, z: 18.8 },
    { x: 40, z: 18.8 },
    { x: 46, z: 18.8 },
    { x: 70, z: 18.8 }
  ],
  [
    { x: -70, z: 33.2 },
    { x: -46, z: 33.2 },
    { x: -40, z: 33.2 },
    { x: -34, z: 33.2 },
    { x: 34, z: 33.2 },
    { x: 40, z: 33.2 },
    { x: 46, z: 33.2 },
    { x: 70, z: 33.2 }
  ],
  [
    { x: -32, z: 32.0 },
    { x: 30, z: 32.0 }
  ],
  [
    { x: 20, z: 14 },
    { x: 31, z: 14 },
    { x: 31, z: -8 },
    { x: 20, z: -8 }
  ],
  [
    { x: -31, z: 14 },
    { x: -20, z: 14 },
    { x: -20, z: -8 },
    { x: -31, z: -8 }
  ],
  [
    { x: -70, z: 34.4 },
    { x: -50, z: 34.4 }
  ]
]);

export const CAR_ROUTES = Object.freeze([
  { axis: 'x', lane: 22.5, from: -86, to: 86, direction: 1, speed: 8.5, file: 'city/car_red.glb' },
  { axis: 'x', lane: 22.5, from: -86, to: 86, direction: 1, speed: 7.2, file: 'city/taxi.glb' },
  {
    axis: 'x',
    lane: 27.5,
    from: 86,
    to: -86,
    direction: -1,
    speed: 9.0,
    file: 'city/car_blue.glb'
  },
  { axis: 'x', lane: 27.5, from: 86, to: -86, direction: -1, speed: 7.6, file: 'city/van.glb' },
  { axis: 'z', lane: -42, from: -46, to: 76, direction: 1, speed: 6.8, file: 'city/car_white.glb' },
  { axis: 'z', lane: -38, from: 76, to: -46, direction: -1, speed: 7.4, file: 'city/taxi.glb' }
]);

export const TRAFFIC_LIGHTS = Object.freeze([
  { x: -45, z: 18.6, rot: 0 },
  { x: -35, z: 18.6, rot: Math.PI },
  { x: -45, z: 31.4, rot: 0 },
  { x: -35, z: 31.4, rot: Math.PI },
  { x: 45, z: 18.6, rot: 0 },
  { x: 35, z: 18.6, rot: Math.PI },
  { x: 45, z: 31.4, rot: 0 },
  { x: 35, z: 31.4, rot: Math.PI }
]);

export const CITY_PROPS = Object.freeze([
  { file: 'city/kiosk.glb', x: -33, z: 32.6, rot: Math.PI, collider: 1.3 },
  { file: 'city/bus_stop.glb', x: 8, z: 32.4, rot: Math.PI, collider: 2.0 },
  { file: 'city/bus_stop.glb', x: -8, z: 17.6, rot: 0, collider: 2.0 }
]);

export function cityDistance(x, z, targetX, targetZ) {
  return Math.hypot(targetX - x, targetZ - z);
}

// ---------------------------------------------------------------------------
// Intersections, crossings and walkable ground
// ---------------------------------------------------------------------------

export const INTERSECTIONS = Object.freeze(
  CROSS_STREETS.map((s) => ({
    id: s.id,
    minX: s.minX,
    maxX: s.maxX,
    minZ: MAIN_STREET.minZ,
    maxZ: MAIN_STREET.maxZ,
    centerX: (s.minX + s.maxX) / 2,
    centerZ: MAIN_STREET.centerZ
  }))
);

function buildCrossings() {
  const out = [];
  for (const s of CROSS_STREETS) {
    // Bands across the cross street, level with each sidewalk of Main Street.
    out.push({
      id: `${s.id}-north`,
      axis: 'x',
      minX: s.minX + 0.3,
      maxX: s.maxX - 0.3,
      minZ: MAIN_STREET.minZ - 5.4,
      maxZ: MAIN_STREET.minZ - 0.6
    });
    out.push({
      id: `${s.id}-south`,
      axis: 'x',
      minX: s.minX + 0.3,
      maxX: s.maxX - 0.3,
      minZ: MAIN_STREET.maxZ + 0.6,
      maxZ: MAIN_STREET.maxZ + 5.4
    });
    // Bands across Main Street, level with each sidewalk of the cross street.
    out.push({
      id: `${s.id}-west`,
      axis: 'z',
      minX: s.minX - 3.8,
      maxX: s.minX - 0.4,
      minZ: MAIN_STREET.minZ + 0.4,
      maxZ: MAIN_STREET.maxZ - 0.4
    });
    out.push({
      id: `${s.id}-east`,
      axis: 'z',
      minX: s.maxX + 0.4,
      maxX: s.maxX + 3.8,
      minZ: MAIN_STREET.minZ + 0.4,
      maxZ: MAIN_STREET.maxZ - 0.4
    });
  }
  return out;
}

// A crossing with axis "x" is walked east-west (it crosses the north-south
// street), so it is safe while north-south traffic is stopped, and vice versa.
export const CROSSINGS = Object.freeze(buildCrossings());

// Brick-paved forecourt that makes FRESH MART read as the landmark of the
// street: it replaces the plain sidewalk band directly in front of the store.
export const PLAZA = Object.freeze({ minX: -14, maxX: 14, minZ: 12.2, maxZ: 20 });
export const POCKET_PARK = Object.freeze({ minX: -76, maxX: -66, minZ: -22, maxZ: -8 });
export const LOT_PATH = Object.freeze({ minX: -26, maxX: -21, minZ: 11.4, maxZ: 14.8 });
export const PARK_LINK = Object.freeze({ minX: 22, maxX: 27, minZ: 11.5, maxZ: 14.5 });
export const POCKET_PARK_LINK = Object.freeze({
  minX: -66,
  maxX: -48,
  minZ: -15.5,
  maxZ: -12.5
});

export const CART_RETURN = Object.freeze({ x: -10.2, z: 15.2, rot: Math.PI / 2 });

export const ACCESSIBLE_BAYS = Object.freeze([
  { x: -21.4, z: 8.6, w: 3.4, d: 5, rot: 0 },
  { x: -21.4, z: 3.2, w: 3.4, d: 5, rot: 0 }
]);

export const EV_CHARGER = Object.freeze({ x: -18.9, z: 11.5, rot: Math.PI });

export const STORE_LANDMARK = Object.freeze({
  pylon: { x: -15.6, z: 15.6, w: 2.6, h: 6.2, d: 0.7 },
  // Flags hug the shop front: a pole out on the pavement ate the only clear
  // lane along the north sidewalk.
  flags: [
    { x: -13.4, z: 13.2 },
    { x: 13.4, z: 13.2 }
  ]
});

export const CITY_WALK_ZONES = Object.freeze([
  ...SIDEWALKS,
  ...CROSSINGS,
  PLAZA,
  LOT_PATH,
  PARK_LINK,
  POCKET_PARK_LINK,
  PARKING_LOT,
  CITY_PARK,
  POCKET_PARK
]);

export function isInsideRect(x, z, r) {
  return x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ;
}

export function isWalkableGround(x, z) {
  for (const zone of CITY_WALK_ZONES) {
    if (isInsideRect(x, z, zone)) return true;
  }
  return false;
}

export function crossingAt(x, z) {
  for (const c of CROSSINGS) {
    if (isInsideRect(x, z, c)) return c;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Traffic signals
// ---------------------------------------------------------------------------

export const TRAFFIC_CYCLE = Object.freeze({
  nsGreen: 9,
  nsYellow: 2.5,
  allRedA: 1,
  ewGreen: 9,
  ewYellow: 2.5,
  allRedB: 1
});

const CYCLE_TOTAL =
  TRAFFIC_CYCLE.nsGreen +
  TRAFFIC_CYCLE.nsYellow +
  TRAFFIC_CYCLE.allRedA +
  TRAFFIC_CYCLE.ewGreen +
  TRAFFIC_CYCLE.ewYellow +
  TRAFFIC_CYCLE.allRedB;

/** Signal state for north-south (cross streets) and east-west (Main Street) traffic. */
export function trafficPhase(time) {
  let t = ((time % CYCLE_TOTAL) + CYCLE_TOTAL) % CYCLE_TOTAL;
  if (t < TRAFFIC_CYCLE.nsGreen) return { ns: 'green', ew: 'red' };
  t -= TRAFFIC_CYCLE.nsGreen;
  if (t < TRAFFIC_CYCLE.nsYellow) return { ns: 'yellow', ew: 'red' };
  t -= TRAFFIC_CYCLE.nsYellow;
  if (t < TRAFFIC_CYCLE.allRedA) return { ns: 'red', ew: 'red' };
  t -= TRAFFIC_CYCLE.allRedA;
  if (t < TRAFFIC_CYCLE.ewGreen) return { ns: 'red', ew: 'green' };
  t -= TRAFFIC_CYCLE.ewGreen;
  if (t < TRAFFIC_CYCLE.ewYellow) return { ns: 'red', ew: 'yellow' };
  return { ns: 'red', ew: 'red' };
}

export function pedestriansMayCross(crossing, time) {
  const phase = trafficPhase(time);
  return crossing.axis === 'x' ? phase.ns === 'red' : phase.ew === 'red';
}

/** Coordinate where a vehicle on this route must stop before an intersection. */
export function stopLineFor(route, intersection) {
  if (route.axis === 'x') {
    return route.direction > 0 ? intersection.minX - 1.8 : intersection.maxX + 1.8;
  }
  return route.direction > 0 ? intersection.minZ - 1.8 : intersection.maxZ + 1.8;
}

// ---------------------------------------------------------------------------
// Buses and destinations
// ---------------------------------------------------------------------------

export const BUS_ROUTES = Object.freeze([
  {
    axis: 'x',
    lane: 22.5,
    from: -86,
    to: 86,
    direction: 1,
    speed: 6.2,
    dwell: 4.5,
    stops: [-8, 50],
    file: 'city/bus.glb'
  },
  {
    axis: 'x',
    lane: 27.5,
    from: 86,
    to: -86,
    direction: -1,
    speed: 6.4,
    dwell: 4.5,
    stops: [8, -50],
    file: 'city/bus.glb'
  }
]);

// Places city walkers head for. Nav routing picks a reachable one each time.
export const CITY_DESTINATIONS = Object.freeze([
  { id: 'store', x: 0, z: 13.6, label: 'FRESH MART' },
  { id: 'plaza', x: 6, z: 16.6 },
  { id: 'bakery', x: -28, z: 35.0 },
  { id: 'cafe', x: -14, z: 35.0 },
  { id: 'pharmacy', x: 0, z: 35.0 },
  { id: 'clothing', x: 14, z: 35.0 },
  { id: 'electronics', x: 28, z: 35.0 },
  { id: 'park', x: 24, z: 2 },
  { id: 'pond', x: 21.5, z: -4 },
  { id: 'lot', x: -24, z: 2 },
  { id: 'bus-south', x: 8, z: 33.4 },
  { id: 'bus-north', x: -8, z: 17.4 },
  { id: 'pocket-park', x: -71, z: -15 },
  { id: 'west-walk', x: -60, z: 32.8 },
  { id: 'east-walk', x: 60, z: 17.4 }
]);
