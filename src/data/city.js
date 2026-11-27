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

export const SIDEWALKS = Object.freeze([
  { minX: -80, maxX: 80, minZ: 14, maxZ: 20 },
  { minX: -80, maxX: 80, minZ: 30, maxZ: 36 },
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
  { id: 'bakery', file: 'city/shop_shell.glb', x: -22, z: 42, rot: Math.PI },
  { id: 'cafe', file: 'city/shop_shell.glb', x: 0, z: 42, rot: Math.PI },
  { id: 'pharmacy', file: 'city/shop_shell.glb', x: 22, z: 42, rot: Math.PI }
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
  [56, 18.4, 0],
  [72, 18.4, 0],
  [-64, 31.6, Math.PI],
  [-48, 31.6, Math.PI],
  [-28, 31.6, Math.PI],
  [-12, 31.6, Math.PI],
  [12, 31.6, Math.PI],
  [28, 31.6, Math.PI],
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
  [30, 33.4, 1.02],
  [50, 33.4, 1.08],
  [70, 33.4, 0.96],
  [22, 10, 1.15],
  [32, 10, 0.98],
  [22, -4, 1.02],
  [32, -4, 1.08],
  [-36, 9, 0.95],
  [-24, -4, 1.06]
]);

export const BENCHES = Object.freeze([
  [-34, 17.2, 0],
  [-6, 17.2, 0],
  [18, 17.2, 0],
  [54, 17.2, 0],
  [-34, 32.8, Math.PI],
  [8, 32.8, Math.PI],
  [30, 32.8, Math.PI],
  [26, 2, Math.PI / 2],
  [28, -2, Math.PI / 2]
]);

export const PLANTERS = Object.freeze([
  [-19, 17.4],
  [-11, 17.4],
  [11, 17.4],
  [19, 17.4],
  [-30, 34.6],
  [30, 34.6],
  [20, 12],
  [34, 12]
]);

export const BINS = Object.freeze([
  [-16, 18.4],
  [16, 18.4],
  [-4, 33.6],
  [4, 33.6],
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
    { x: -32, z: 34.4 },
    { x: 30, z: 34.4 }
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
  { file: 'city/bus_stop.glb', x: 8, z: 32.4, rot: Math.PI, collider: 2.0 }
]);

export function cityDistance(x, z, targetX, targetZ) {
  return Math.hypot(targetX - x, targetZ - z);
}
