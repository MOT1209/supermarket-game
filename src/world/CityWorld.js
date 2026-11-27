import * as THREE from 'three';
import { cloneModel } from '../utils/AssetLoader.js';
import { makeCanvas } from '../utils/textures.js';
import { disposeObject3D } from '../utils/dispose.js';
import {
  CITY_BOUNDS,
  MAIN_STREET,
  CROSS_STREETS,
  INTERSECTIONS,
  CROSSINGS,
  SIDEWALKS,
  PARKING_LOT,
  CITY_PARK,
  POCKET_PARK,
  PLAZA,
  LOT_PATH,
  PARK_LINK,
  POCKET_PARK_LINK,
  ACCESSIBLE_BAYS,
  EV_CHARGER,
  CART_RETURN,
  STORE_LANDMARK,
  BUILDING_PLACEMENTS,
  STREETLIGHTS,
  TREES,
  BENCHES,
  PLANTERS,
  BINS,
  HYDRANTS,
  PARKED_CARS,
  TRAFFIC_LIGHTS,
  CITY_PROPS,
  trafficPhase,
  isWalkableGround
} from '../data/city.js';
import { BUSINESSES } from '../data/businesses.js';
import ShopWorld from './ShopWorld.js';
import { NavGrid } from '../systems/Navigation.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function sharedMaterial(color, opts = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.82, ...opts });
  m.userData.shared = true;
  return m;
}

function sharedBasic(color, opts = {}) {
  const m = new THREE.MeshBasicMaterial({ color, ...opts });
  m.userData.shared = true;
  return m;
}

function unitBoxGeometry() {
  if (!unitBoxGeometry.geo) {
    unitBoxGeometry.geo = new THREE.BoxGeometry(1, 1, 1);
    unitBoxGeometry.geo.userData.shared = true;
  }
  return unitBoxGeometry.geo;
}

function plane(w, h, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  m.receiveShadow = true;
  return m;
}

function box(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(unitBoxGeometry(), mat);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function asphaltTexture() {
  return makeCanvas(
    (x, w, h) => {
      x.fillStyle = '#3d4348';
      x.fillRect(0, 0, w, h);
      for (let i = 0; i < 2400; i++) {
        const g = 45 + Math.floor(Math.random() * 35);
        x.fillStyle = `rgb(${g},${g + 3},${g + 5})`;
        x.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      }
    },
    256,
    256
  );
}

function sidewalkTexture() {
  return makeCanvas(
    (x, w, h) => {
      x.fillStyle = '#b9b6aa';
      x.fillRect(0, 0, w, h);
      x.strokeStyle = '#9d9a8e';
      x.lineWidth = 3;
      for (let i = 0; i <= w; i += 64) {
        x.beginPath();
        x.moveTo(i, 0);
        x.lineTo(i, h);
        x.stroke();
        x.beginPath();
        x.moveTo(0, i);
        x.lineTo(w, i);
        x.stroke();
      }
      for (let i = 0; i < 700; i++) {
        x.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.04)';
        x.fillRect(Math.random() * w, Math.random() * h, 3, 3);
      }
    },
    256,
    256
  );
}

function brickTexture() {
  return makeCanvas(
    (x, w, h) => {
      x.fillStyle = '#a98570';
      x.fillRect(0, 0, w, h);
      const bw = 64;
      const bh = 32;
      for (let row = 0; row < h / bh; row++) {
        for (let col = -1; col < w / bw; col++) {
          const offset = row % 2 ? bw / 2 : 0;
          const shade = 150 + Math.floor(Math.random() * 30);
          x.fillStyle = `rgb(${shade + 18},${shade - 8},${shade - 34})`;
          x.fillRect(col * bw + offset + 3, row * bh + 3, bw - 6, bh - 6);
        }
      }
    },
    256,
    256
  );
}

function landmarkTexture() {
  return makeCanvas(
    (x, w, h) => {
      x.fillStyle = '#0f3f24';
      x.fillRect(0, 0, w, h);
      x.strokeStyle = '#d8f0b0';
      x.lineWidth = 10;
      x.strokeRect(16, 16, w - 32, h - 32);
      x.fillStyle = '#8fd6a2';
      x.beginPath();
      x.ellipse(w / 2, h * 0.2, 74, 40, -0.5, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = '#f4ffe9';
      x.textAlign = 'center';
      x.font = 'bold 150px Arial';
      x.fillText('FRESH', w / 2, h * 0.42);
      x.fillText('MART', w / 2, h * 0.58);
      x.font = 'bold 52px Arial';
      x.fillStyle = '#d8f0b0';
      x.fillText('GROCERIES', w / 2, h * 0.72);
      x.font = 'bold 40px Arial';
      x.fillText('OPEN 24/7', w / 2, h * 0.84);
    },
    420,
    1024
  );
}

function accessMarkTexture() {
  return makeCanvas(
    (x, w, h) => {
      x.clearRect(0, 0, w, h);
      x.fillStyle = '#ffffff';
      x.beginPath();
      x.arc(w * 0.42, h * 0.26, w * 0.1, 0, Math.PI * 2);
      x.fill();
      x.lineWidth = w * 0.09;
      x.strokeStyle = '#ffffff';
      x.beginPath();
      x.moveTo(w * 0.42, h * 0.36);
      x.lineTo(w * 0.42, h * 0.6);
      x.lineTo(w * 0.66, h * 0.6);
      x.lineTo(w * 0.74, h * 0.8);
      x.stroke();
      x.beginPath();
      x.arc(w * 0.5, h * 0.66, w * 0.2, 0, Math.PI * 2);
      x.stroke();
    },
    256,
    256
  );
}

function grassTexture() {
  return makeCanvas(
    (x, w, h) => {
      x.fillStyle = '#5f7d4c';
      x.fillRect(0, 0, w, h);
      for (let i = 0; i < 3200; i++) {
        x.fillStyle = Math.random() > 0.5 ? '#688755' : '#557044';
        x.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      }
    },
    256,
    256
  );
}

function parkPathTexture() {
  return makeCanvas(
    (x, w, h) => {
      x.fillStyle = '#c6b795';
      x.fillRect(0, 0, w, h);
      for (let i = 0; i < 500; i++) {
        x.fillStyle = Math.random() > 0.5 ? '#b8a986' : '#d0c2a0';
        x.fillRect(Math.random() * w, Math.random() * h, 4, 4);
      }
    },
    256,
    256
  );
}

export default class CityWorld {
  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    this.group.name = 'city';
    this.colliders = [];
    this.shops = new Map();
    this.shopWorld = null;
    this.trafficLights = [];
    this.cullGroups = [];
    this.shopLights = [];
    this.waypoint = null;
    this.waypointBeacon = null;
    this.nav = null;
    this.fallbacks = new Map();
    this.assetJobs = [];
    this.materials = {
      wall: sharedMaterial(0xd7cdb8, { roughness: 0.9 }),
      wallDark: sharedMaterial(0x8b8375, { roughness: 0.92 }),
      roof: sharedMaterial(0x555b5e, { roughness: 0.95 }),
      glass: sharedMaterial(0x9ed3e4, {
        transparent: true,
        opacity: 0.28,
        roughness: 0.12,
        metalness: 0.1
      }),
      wood: sharedMaterial(0x7c5a3c, { roughness: 0.9 }),
      metal: sharedMaterial(0x606a70, { metalness: 0.55, roughness: 0.4 }),
      dark: sharedMaterial(0x262b2d, { roughness: 0.8 }),
      white: sharedMaterial(0xf2efe6, { roughness: 0.85 }),
      awning: sharedMaterial(0xc56a3a, { roughness: 0.8 })
    };
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------
  build() {
    this.game.scene.add(this.group);
    this.buildGround();
    this.buildRoads();
    this.buildSidewalks();
    this.buildParking();
    this.buildPark();
    this.buildPocketPark();
    this.buildBuildings();
    this.buildShops();
    this.buildProps();
    this.buildPlaza();
    this.buildLandmark();
    this.buildAccessibleParking();
    this.buildWaypoint();
    this.registerCullGroups();
    this.buildNav();
  }

  collides(x, z, radius = 0.38) {
    for (const c of this.colliders) {
      if (c.disabled) continue;
      const nx = clamp(x, c.minX, c.maxX);
      const nz = clamp(z, c.minZ, c.maxZ);
      const dx = x - nx;
      const dz = z - nz;
      if (dx * dx + dz * dz < radius * radius) return true;
    }
    return false;
  }

  isInCity(x, z) {
    return (
      x >= CITY_BOUNDS.minX &&
      x <= CITY_BOUNDS.maxX &&
      z >= CITY_BOUNDS.minZ &&
      z <= CITY_BOUNDS.maxZ
    );
  }

  addCollider(minX, maxX, minZ, maxZ) {
    const collider = { minX, maxX, minZ, maxZ };
    this.colliders.push(collider);
    return collider;
  }

  setWaypoint(businessId) {
    const b = BUSINESSES[businessId];
    if (!b || !this.waypointBeacon) return false;
    this.waypoint = { businessId, x: b.entrance.x, z: b.entrance.z - 1.6 };
    this.waypointBeacon.position.set(this.waypoint.x, 0, this.waypoint.z);
    this.waypointBeacon.visible = true;
    return true;
  }

  clearWaypoint() {
    this.waypoint = null;
    if (this.waypointBeacon) this.waypointBeacon.visible = false;
  }

  waypointText() {
    if (!this.waypoint) return '';
    const b = BUSINESSES[this.waypoint.businessId];
    const p = this.game.player?.pos;
    if (!b || !p) return '';
    const d = Math.hypot(this.waypoint.x - p.x, this.waypoint.z - p.z);
    return `🧭 ${b.name} — ${d.toFixed(0)}m`;
  }

  update(dt, time) {
    this.updateSignals(time);
    this.shopWorld?.update?.(dt, time);
    if (this.waypointBeacon?.visible) {
      this.waypointBeacon.rotation.y = time * 1.4;
      this.waypointBeacon.position.y = Math.sin(time * 2.2) * 0.18;
    }
    if (!this.cullTimer || (this.cullTimer -= dt) <= 0) {
      this.cullTimer = 0.45;
      const p = this.game.player?.pos;
      if (p) {
        for (const c of this.cullGroups) {
          c.object.visible = Math.hypot(c.x - p.x, c.z - p.z) < c.radius;
        }
        for (const l of this.shopLights) {
          l.light.intensity = Math.hypot(l.x - p.x, l.z - p.z) < 18 ? 0.9 : 0;
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Ground, roads and sidewalks
  // -------------------------------------------------------------------------
  buildGround() {
    const groundMat = sharedMaterial(0xffffff, { map: grassTexture(), roughness: 1 });
    const ground = plane(160, 112, groundMat, 0, -0.06, 14);
    ground.receiveShadow = true;
    this.group.add(ground);
  }

  buildRoads() {
    const asphalt = sharedMaterial(0xffffff, { map: asphaltTexture(), roughness: 0.96 });
    const roadY = 0.005;
    this.group.add(plane(160, 10, asphalt, 0, roadY, MAIN_STREET.centerZ));
    for (const s of CROSS_STREETS) {
      this.group.add(plane(s.maxX - s.minX, 108, asphalt, (s.minX + s.maxX) / 2, roadY, 14));
    }

    const dashMat = sharedBasic(0xe8e2c8);
    const dashGeo = new THREE.BoxGeometry(1.8, 0.02, 0.14);
    dashGeo.userData.shared = true;
    for (let x = -76; x <= 76; x += 6) {
      if (CROSS_STREETS.some((s) => x > s.minX - 3 && x < s.maxX + 3)) continue;
      const d = new THREE.Mesh(dashGeo, dashMat);
      d.position.set(x, 0.03, MAIN_STREET.centerZ);
      this.group.add(d);
    }
    const zDashGeo = new THREE.BoxGeometry(0.14, 0.02, 1.8);
    zDashGeo.userData.shared = true;
    for (const s of CROSS_STREETS) {
      const cx = (s.minX + s.maxX) / 2;
      for (let z = -36; z <= 64; z += 6) {
        if (z > MAIN_STREET.minZ - 3 && z < MAIN_STREET.maxZ + 3) continue;
        const d = new THREE.Mesh(zDashGeo, dashMat);
        d.position.set(cx, 0.03, z);
        this.group.add(d);
      }
    }

    // Zebra crossings on all four arms of every intersection. Bars run across
    // the walking direction, which is what makes them read as a crossing.
    for (const c of CROSSINGS) {
      const acrossX = c.maxX - c.minX;
      const acrossZ = c.maxZ - c.minZ;
      if (c.axis === 'x') {
        const count = Math.max(3, Math.floor(acrossX / 1.1));
        for (let i = 0; i < count; i++) {
          const bar = new THREE.Mesh(unitBoxGeometry(), dashMat);
          bar.scale.set(0.5, 0.02, acrossZ * 0.78);
          bar.position.set(c.minX + 0.8 + i * 1.1, 0.035, (c.minZ + c.maxZ) / 2);
          this.group.add(bar);
        }
      } else {
        const count = Math.max(3, Math.floor(acrossZ / 1.1));
        for (let i = 0; i < count; i++) {
          const bar = new THREE.Mesh(unitBoxGeometry(), dashMat);
          bar.scale.set(acrossX * 0.78, 0.02, 0.5);
          bar.position.set((c.minX + c.maxX) / 2, 0.035, c.minZ + 0.8 + i * 1.1);
          this.group.add(bar);
        }
      }
    }

    // Stop bars so drivers (and the traffic system) have a clear place to wait.
    const stopMat = sharedBasic(0xe8e2c8);
    for (const it of INTERSECTIONS) {
      this.group.add(box(0.45, 0.02, 4.4, stopMat, it.minX - 1.8, 0.034, 22.5));
      this.group.add(box(0.45, 0.02, 4.4, stopMat, it.maxX + 1.8, 0.034, 27.5));
      this.group.add(box(4.0, 0.02, 0.45, stopMat, it.centerX - 2, 0.034, it.minZ - 1.8));
      this.group.add(box(4.0, 0.02, 0.45, stopMat, it.centerX + 2, 0.034, it.maxZ + 1.8));
    }
  }

  buildSidewalks() {
    const mat = sharedMaterial(0xffffff, { map: sidewalkTexture(), roughness: 0.95 });
    for (const s of SIDEWALKS) {
      const w = s.maxX - s.minX;
      const d = s.maxZ - s.minZ;
      this.group.add(plane(w, d, mat, (s.minX + s.maxX) / 2, 0.04, (s.minZ + s.maxZ) / 2));
    }
    // Curbs stop at each cross street for the same reason the sidewalks do.
    const curbMat = sharedMaterial(0x9a978c, { roughness: 0.9 });
    for (const [minX, maxX] of [
      [-80, -44],
      [-36, 36],
      [44, 80]
    ]) {
      const w = maxX - minX;
      this.group.add(box(w, 0.14, 0.18, curbMat, (minX + maxX) / 2, 0.07, 19.95));
      this.group.add(box(w, 0.14, 0.18, curbMat, (minX + maxX) / 2, 0.07, 30.05));
    }
  }

  buildParking() {
    const lot = PARKING_LOT;
    const asphalt = sharedMaterial(0xffffff, { map: asphaltTexture(), roughness: 0.96 });
    const cx = (lot.minX + lot.maxX) / 2;
    const cz = (lot.minZ + lot.maxZ) / 2;
    this.group.add(plane(lot.maxX - lot.minX, lot.maxZ - lot.minZ, asphalt, cx, 0.01, cz));
    const lineMat = sharedBasic(0xe9e4c9);
    const lineGeo = new THREE.BoxGeometry(3.6, 0.02, 0.12);
    lineGeo.userData.shared = true;
    const lineX = lot.minX + 2;
    for (let z = -6; z <= 10; z += 4) {
      const m = new THREE.Mesh(lineGeo, lineMat);
      m.position.set(lineX, 0.03, z);
      this.group.add(m);
    }
    // Parking sign.
    const sign = this.makeTextPlane('P  PARKING', '#1c4f8a', 2.2, 1.1, 2.6);
    sign.position.set(lot.maxX + 1.2, 2.2, lot.maxZ - 1.8);
    sign.rotation.y = -Math.PI / 2;
    this.group.add(sign);
  }

  buildPark() {
    const p = CITY_PARK;
    const cx = (p.minX + p.maxX) / 2;
    const cz = (p.minZ + p.maxZ) / 2;
    const grass = sharedMaterial(0xffffff, { map: grassTexture(), roughness: 1 });
    this.group.add(plane(p.maxX - p.minX, p.maxZ - p.minZ, grass, cx, 0.035, cz));
    const path = sharedMaterial(0xffffff, { map: parkPathTexture(), roughness: 0.95 });
    this.group.add(plane(2.4, p.maxZ - p.minZ, path, cx, 0.05, cz));
    this.group.add(plane(p.maxX - p.minX, 2.2, path, cx, 0.05, cz));
    // Pond.
    const pond = new THREE.Mesh(
      new THREE.CircleGeometry(3.4, 24),
      sharedMaterial(0x4c89a8, { transparent: true, opacity: 0.8, roughness: 0.25 })
    );
    pond.rotation.x = -Math.PI / 2;
    pond.position.set(cx - 3, 0.06, cz - 6);
    this.group.add(pond);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(3.45, 0.14, 8, 24),
      sharedMaterial(0x9d9a8a, { roughness: 0.9 })
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(cx - 3, 0.08, cz - 6);
    this.group.add(rim);

    // Paved link from the park to the sidewalk, so walkers have a route in.
    this.group.add(
      plane(
        PARK_LINK.maxX - PARK_LINK.minX,
        PARK_LINK.maxZ - PARK_LINK.minZ,
        path,
        (PARK_LINK.minX + PARK_LINK.maxX) / 2,
        0.05,
        (PARK_LINK.minZ + PARK_LINK.maxZ) / 2
      )
    );
  }

  // -------------------------------------------------------------------------
  // Buildings
  // -------------------------------------------------------------------------
  buildBuildings() {
    for (const p of BUILDING_PLACEMENTS) {
      // One LOD group per placement: the shared GLB module up close and a cheap
      // procedural block far away, so the skyline never costs full detail.
      const lod = new THREE.LOD();
      lod.name = `building_${p.x}_${p.z}`;
      lod.position.set(p.x, 0, p.z);
      lod.rotation.y = p.rot;
      lod.addLevel(this.makeBuildingFallback(p), p.lodFar ?? 95);
      this.group.add(lod);
      this.fallbacks.set(lod.name, lod);
      this.addCollider(p.x - p.w / 2, p.x + p.w / 2, p.z - p.d / 2, p.z + p.d / 2);
      this.assetJobs.push(
        cloneModel(p.file).then((model) => {
          if (!model) return;
          const bounds = new THREE.Box3().setFromObject(model);
          const size = bounds.getSize(new THREE.Vector3());
          // Modular GLBs are authored once and reused at several footprints.
          const sx = size.x > 0.01 ? p.w / size.x : 1;
          const sy = size.y > 0.01 ? p.h / size.y : 1;
          const sz = size.z > 0.01 ? p.d / size.z : 1;
          model.scale.set(sx, sy, sz);
          model.position.set(
            -((bounds.min.x + bounds.max.x) / 2) * sx,
            -bounds.min.y * sy,
            -((bounds.min.z + bounds.max.z) / 2) * sz
          );
          model.traverse((o) => {
            if (o.isMesh) {
              o.castShadow = true;
              o.receiveShadow = true;
            }
          });
          lod.addLevel(model, 0);
        })
      );
    }
  }

  // Local-space block used as the far LOD and as the fallback when a modular
  // GLB is missing. Window bands keep it to four boxes per floor.
  makeBuildingFallback(p) {
    const g = new THREE.Group();
    const mat = sharedMaterial(p.color, { roughness: 0.85 });
    g.add(box(p.w, p.h, p.d, mat, 0, p.h / 2, 0));
    const plinth = sharedMaterial(0x9c9a90, { roughness: 0.92 });
    g.add(box(p.w + 0.12, 2.4, p.d + 0.12, plinth, 0, 1.2, 0));
    const roof = sharedMaterial(0x4d5355, { roughness: 0.95 });
    g.add(box(p.w + 0.2, 0.4, p.d + 0.2, roof, 0, p.h + 0.2, 0));
    if (p.h > 14) {
      const capMat = sharedMaterial(0x6f7a80, { roughness: 0.9 });
      g.add(box(p.w * 0.4, 1.4, p.d * 0.4, capMat, 0, p.h + 1.0, 0));
    }
    const winMat = sharedBasic(0x3b596b);
    const rows = Math.max(1, Math.floor((p.h - 4) / 3));
    for (let r = 0; r < rows; r++) {
      const y = 4 + r * 3;
      g.add(box(p.w - 1.4, 0.9, 0.08, winMat, 0, y, -p.d / 2 - 0.02));
      g.add(box(p.w - 1.4, 0.9, 0.08, winMat, 0, y, p.d / 2 + 0.02));
      g.add(box(0.08, 0.9, p.d - 1.4, winMat, -p.w / 2 - 0.02, y, 0));
      g.add(box(0.08, 0.9, p.d - 1.4, winMat, p.w / 2 + 0.02, y, 0));
    }
    return g;
  }

  // -------------------------------------------------------------------------
  // Functional neighbour shops
  // -------------------------------------------------------------------------
  buildShops() {
    this.shopWorld = new ShopWorld(this.game, this);
    this.shopWorld.build();
    this.shops = this.shopWorld.shops;
  }

  // -------------------------------------------------------------------------
  // Props
  // -------------------------------------------------------------------------
  buildProps() {
    for (const [x, z, rot] of STREETLIGHTS) {
      const fallback = this.makeStreetlightFallback();
      fallback.position.set(x, 0, z);
      fallback.rotation.y = rot;
      this.group.add(fallback);
      this.addCollider(x - 0.3, x + 0.3, z - 0.3, z + 0.3);
      this.assetJobs.push(
        cloneModel('city/streetlight.glb').then((model) => {
          if (!model) return;
          model.position.set(x, 0, z);
          model.rotation.y = rot;
          this.group.add(model);
          this.group.remove(fallback);
          disposeObject3D(fallback);
        })
      );
    }

    for (let i = 0; i < TREES.length; i++) {
      const [x, z, scale] = TREES[i];
      const lod = new THREE.LOD();
      lod.position.set(x, 0, z);
      const low = this.makeLowTree();
      low.scale.setScalar(scale);
      lod.addLevel(low, 0);
      this.group.add(lod);
      this.addCollider(x - 0.32, x + 0.32, z - 0.32, z + 0.32);
      const file = i % 2 ? 'city/tree_a.glb' : 'city/tree_b.glb';
      this.assetJobs.push(
        cloneModel(file).then((model) => {
          if (!model) return;
          model.scale.setScalar(scale);
          model.traverse((o) => {
            if (o.isMesh) {
              o.castShadow = true;
              o.receiveShadow = true;
            }
          });
          lod.levels.length = 0;
          lod.addLevel(model, 0);
          lod.addLevel(low, 42);
        })
      );
    }

    for (const [x, z, rot] of BENCHES) {
      const fallback = this.makeBenchFallback();
      fallback.position.set(x, 0, z);
      fallback.rotation.y = rot;
      this.group.add(fallback);
      const alongX = Math.abs(Math.sin(rot)) < 0.5;
      this.addCollider(
        x - (alongX ? 1.1 : 0.5),
        x + (alongX ? 1.1 : 0.5),
        z - (alongX ? 0.5 : 1.1),
        z + (alongX ? 0.5 : 1.1)
      );
      this.assetJobs.push(
        cloneModel('city/bench.glb').then((model) => {
          if (!model) return;
          model.position.set(x, 0, z);
          model.rotation.y = rot;
          this.group.add(model);
          this.group.remove(fallback);
          disposeObject3D(fallback);
        })
      );
    }

    for (const [x, z] of PLANTERS) {
      this.group.add(this.makePlanterFallback(x, z));
      this.addCollider(x - 0.55, x + 0.55, z - 0.55, z + 0.55);
    }
    for (const [x, z] of BINS) {
      const bin = this.makeBinFallback(x, z);
      this.group.add(bin);
      this.addCollider(x - 0.38, x + 0.38, z - 0.38, z + 0.38);
    }
    for (const [x, z] of HYDRANTS) {
      this.group.add(this.makeHydrantFallback(x, z));
      this.addCollider(x - 0.28, x + 0.28, z - 0.28, z + 0.28);
    }

    for (const car of PARKED_CARS) {
      const fallback = this.makeCarFallback(0x8a8f94);
      fallback.position.set(car.x, 0, car.z);
      fallback.rotation.y = car.rot;
      this.group.add(fallback);
      this.addCollider(car.x - 1.1, car.x + 1.1, car.z - 2.0, car.z + 2.0);
      this.assetJobs.push(
        cloneModel(car.file).then((model) => {
          if (!model) return;
          model.position.set(car.x, 0, car.z);
          model.rotation.y = car.rot;
          this.group.add(model);
          this.group.remove(fallback);
          disposeObject3D(fallback);
        })
      );
    }

    for (const { x, z, rot } of TRAFFIC_LIGHTS) {
      const light = this.makeTrafficLightFallback();
      light.group.position.set(x, 0, z);
      light.group.rotation.y = rot;
      this.group.add(light.group);
      this.trafficLights.push(light);
      this.addCollider(x - 0.28, x + 0.28, z - 0.28, z + 0.28);
      this.assetJobs.push(
        cloneModel('city/traffic_light.glb').then((model) => {
          if (!model) return;
          const lenses = {
            red: model.getObjectByName('light_red'),
            yellow: model.getObjectByName('light_yellow'),
            green: model.getObjectByName('light_green')
          };
          for (const key of ['red', 'yellow', 'green']) {
            if (lenses[key]?.material) lenses[key].material = lenses[key].material.clone();
          }
          model.position.set(x, 0, z);
          model.rotation.y = rot;
          this.group.add(model);
          this.group.remove(light.group);
          disposeObject3D(light.group);
          light.group = model;
          light.lenses = lenses;
        })
      );
    }

    for (const p of CITY_PROPS) {
      const fallback = this.makeKioskFallback(p.file.includes('bus') ? 'bus' : 'kiosk');
      fallback.position.set(p.x, 0, p.z);
      fallback.rotation.y = p.rot;
      this.group.add(fallback);
      const half = p.collider || 1.2;
      this.addCollider(p.x - half, p.x + half, p.z - half * 0.6, p.z + half * 0.6);
      this.assetJobs.push(
        cloneModel(p.file).then((model) => {
          if (!model) return;
          model.position.set(p.x, 0, p.z);
          model.rotation.y = p.rot;
          this.group.add(model);
          this.group.remove(fallback);
          disposeObject3D(fallback);
        })
      );
    }
  }

  makeTextPlane(text, bg, w, h, fontSize) {
    const tex = makeCanvas(
      (x, cw, ch) => {
        x.fillStyle = bg;
        x.fillRect(0, 0, cw, ch);
        x.strokeStyle = '#f4f0df';
        x.lineWidth = 8;
        x.strokeRect(8, 8, cw - 16, ch - 16);
        x.fillStyle = '#fff';
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.font = `bold ${fontSize * 24}px Arial`;
        x.fillText(text, cw / 2, ch / 2);
      },
      512,
      256
    );
    return new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })
    );
  }

  makeStreetlightFallback() {
    const g = new THREE.Group();
    const pole = this.materials.metal;
    g.add(box(0.18, 5.2, 0.18, pole, 0, 2.6, 0));
    g.add(box(1.5, 0.12, 0.12, pole, 0.65, 5.1, 0));
    g.add(box(0.7, 0.25, 0.35, pole, 1.35, 5.05, 0));
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.24), sharedBasic(0xffe4a8));
    bulb.position.set(1.35, 4.9, 0);
    g.add(bulb);
    return g;
  }

  makeLowTree() {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.2, 2.2, 7),
      this.materials.wood
    );
    trunk.position.y = 1.1;
    g.add(trunk);
    const crown = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.35, 1),
      sharedMaterial(0x3c7040, { roughness: 0.9 })
    );
    crown.position.y = 3.1;
    crown.castShadow = true;
    g.add(crown);
    return g;
  }

  makeBenchFallback() {
    const g = new THREE.Group();
    const wood = sharedMaterial(0x7a5636, { roughness: 0.9 });
    g.add(box(2.0, 0.12, 0.65, wood, 0, 0.55, 0));
    g.add(box(2.0, 0.55, 0.1, wood, 0, 0.85, -0.27));
    g.add(box(0.12, 0.55, 0.55, this.materials.metal, -0.85, 0.28, 0));
    g.add(box(0.12, 0.55, 0.55, this.materials.metal, 0.85, 0.28, 0));
    return g;
  }

  makePlanterFallback(x, z) {
    const g = new THREE.Group();
    const pot = sharedMaterial(0x8d5b3c, { roughness: 0.9 });
    g.add(box(1.0, 0.6, 1.0, pot, x, 0.3, z));
    const leaf = sharedMaterial(0x3f7f46, { roughness: 0.85 });
    for (const [ox, oy, oz, s] of [
      [0, 0.95, 0, 0.5],
      [-0.3, 0.8, 0.2, 0.34],
      [0.3, 0.85, -0.2, 0.36]
    ]) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), leaf);
      m.position.set(x + ox, oy, z + oz);
      m.castShadow = true;
      g.add(m);
    }
    return g;
  }

  makeBinFallback(x, z) {
    const g = new THREE.Group();
    const bin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.3, 0.9, 10),
      sharedMaterial(0x2f6b40)
    );
    bin.position.set(x, 0.45, z);
    bin.castShadow = true;
    g.add(bin);
    return g;
  }

  makeHydrantFallback(x, z) {
    const g = new THREE.Group();
    const red = sharedMaterial(0xb32d22);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.7, 8), red);
    body.position.set(x, 0.35, z);
    g.add(body);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), red);
    cap.position.set(x, 0.72, z);
    g.add(cap);
    return g;
  }

  makeCarFallback(color) {
    const g = new THREE.Group();
    const body = sharedMaterial(color, { metalness: 0.35, roughness: 0.4 });
    const glass = sharedMaterial(0x22303a, { roughness: 0.2 });
    g.add(box(1.8, 0.55, 3.7, body, 0, 0.62, 0));
    g.add(box(1.55, 0.65, 1.9, glass, 0, 1.25, 0.1));
    for (const x of [-0.8, 0.8]) {
      for (const z of [-1.2, 1.2]) {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.34, 0.34, 0.24, 10),
          this.materials.dark
        );
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.36, z);
        g.add(wheel);
      }
    }
    return g;
  }

  makeTrafficLightFallback() {
    const g = new THREE.Group();
    g.add(box(0.16, 3.2, 0.16, this.materials.metal, 0, 1.6, 0));
    g.add(box(0.5, 1.35, 0.4, this.materials.dark, 0, 3.25, 0));
    const mk = (color, y) => {
      // Each lens owns its material so the signal can change without repainting
      // every other light in the city.
      const mat = new THREE.MeshBasicMaterial({ color });
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), mat);
      lens.position.set(0, y, 0.21);
      g.add(lens);
      return lens;
    };
    return {
      group: g,
      lenses: { red: mk(0x4a1010, 3.65), yellow: mk(0x4a3a10, 3.25), green: mk(0x104a18, 2.85) }
    };
  }

  makeKioskFallback(kind) {
    const g = new THREE.Group();
    if (kind === 'bus') {
      g.add(box(3.6, 0.18, 1.6, this.materials.metal, 0, 2.7, 0));
      g.add(box(0.18, 2.7, 0.18, this.materials.metal, -1.6, 1.35, 0.5));
      g.add(box(0.18, 2.7, 0.18, this.materials.metal, 1.6, 1.35, 0.5));
      g.add(box(3.2, 1.8, 0.12, this.materials.glass, 0, 1.6, -0.55));
      g.add(box(2.4, 0.12, 0.45, this.materials.wood, 0, 0.55, 0.1));
    } else {
      g.add(box(2.2, 2.2, 1.8, this.materials.wood, 0, 1.1, 0));
      g.add(box(2.5, 0.18, 2.1, this.materials.roof, 0, 2.28, 0));
      g.add(box(1.7, 0.8, 0.1, this.materials.glass, 0, 1.55, 0.95));
    }
    return g;
  }

  // -------------------------------------------------------------------------
  // Waypoint and culling
  // -------------------------------------------------------------------------
  // -------------------------------------------------------------------------
  // FRESH MART forecourt, landmark and accessible parking
  // -------------------------------------------------------------------------
  buildPlaza() {
    const brick = sharedMaterial(0xffffff, { map: brickTexture(), roughness: 0.9 });
    const w = PLAZA.maxX - PLAZA.minX;
    const d = PLAZA.maxZ - PLAZA.minZ;
    const cx = (PLAZA.minX + PLAZA.maxX) / 2;
    const cz = (PLAZA.minZ + PLAZA.maxZ) / 2;
    this.group.add(plane(w, d, brick, cx, 0.05, cz));
    const curb = sharedMaterial(0x9a978c, { roughness: 0.9 });
    this.group.add(box(w, 0.1, 0.2, curb, cx, 0.05, PLAZA.maxZ - 0.1));

    // Benches sit on the kerb line only: furniture along the sides of the
    // forecourt used to fence the plaza off from the sidewalk and left the
    // walkers with no route out.
    for (const [x, z, rot] of [
      [-9.4, 18.6, 0],
      [9.4, 18.6, 0]
    ]) {
      const bench = this.makeBenchFallback();
      bench.position.set(x, 0, z);
      bench.rotation.y = rot;
      this.group.add(bench);
      const alongX = Math.abs(Math.sin(rot)) < 0.5;
      this.addCollider(
        x - (alongX ? 1.1 : 0.5),
        x + (alongX ? 1.1 : 0.5),
        z - (alongX ? 0.5 : 1.1),
        z + (alongX ? 0.5 : 1.1)
      );
    }
    for (const [x, z] of [
      [-6.2, 13.2],
      [6.2, 13.2]
    ]) {
      this.group.add(this.makePlanterFallback(x, z));
      this.addCollider(x - 0.55, x + 0.55, z - 0.55, z + 0.55);
    }
    this.buildCartReturn();
  }

  buildCartReturn() {
    const g = new THREE.Group();
    const metal = this.materials.metal;
    g.add(box(2.4, 1.0, 0.12, metal, 0, 0.5, -0.5));
    g.add(box(0.12, 1.0, 1.0, metal, -1.14, 0.5, 0));
    g.add(box(0.12, 1.0, 1.0, metal, 1.14, 0.5, 0));
    const cartMat = sharedMaterial(0x9aa6ad, { metalness: 0.4, roughness: 0.45 });
    for (let i = 0; i < 5; i++) {
      g.add(box(0.34, 0.5, 0.62, cartMat, -0.72 + i * 0.36, 0.42, 0.05));
    }
    g.position.set(CART_RETURN.x, 0, CART_RETURN.z);
    g.rotation.y = CART_RETURN.rot;
    this.group.add(g);
    this.addCollider(
      CART_RETURN.x - 0.75,
      CART_RETURN.x + 0.75,
      CART_RETURN.z - 1.15,
      CART_RETURN.z + 1.15
    );
  }

  buildLandmark() {
    const L = STORE_LANDMARK.pylon;
    const pylon = new THREE.Group();
    pylon.add(box(L.w, 1.0, L.d + 0.2, sharedMaterial(0x2e3b33, { roughness: 0.8 }), 0, 0.5, 0));
    pylon.add(
      box(L.w - 0.2, L.h, L.d, sharedMaterial(0x1d5130, { roughness: 0.7 }), 0, L.h / 2 + 0.6, 0)
    );
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(L.w - 0.3, L.h - 1.2),
      new THREE.MeshBasicMaterial({ map: landmarkTexture(), side: THREE.DoubleSide })
    );
    face.position.set(0, L.h / 2 + 0.6, L.d / 2 + 0.02);
    pylon.add(face);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(L.w, 0.18, L.d + 0.1), sharedBasic(0xffe08a));
    cap.position.y = L.h + 1.3;
    pylon.add(cap);
    pylon.position.set(L.x, 0, L.z);
    this.group.add(pylon);
    this.addCollider(L.x - L.w / 2, L.x + L.w / 2, L.z - L.d / 2, L.z + L.d / 2);

    // Green flags mark the two ends of the forecourt.
    const flagMat = new THREE.MeshStandardMaterial({
      color: 0x2f8f4e,
      side: THREE.DoubleSide,
      roughness: 0.8
    });
    for (const f of STORE_LANDMARK.flags) {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.09, 7, 8),
        this.materials.metal
      );
      pole.position.set(f.x, 3.5, f.z);
      this.group.add(pole);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.9, 8, 1), flagMat);
      flag.position.set(f.x + 0.85, 6.4, f.z);
      this.group.add(flag);
      this.addCollider(f.x - 0.22, f.x + 0.22, f.z - 0.22, f.z + 0.22);
    }
  }

  buildAccessibleParking() {
    const paint = sharedBasic(0x2f6fb5);
    const white = sharedBasic(0xece8d8);
    for (const bay of ACCESSIBLE_BAYS) {
      this.group.add(plane(bay.w, bay.d, paint, bay.x, 0.02, bay.z));
      this.group.add(box(bay.w, 0.02, 0.14, white, bay.x, 0.03, bay.z - bay.d / 2 + 0.07));
      this.group.add(box(bay.w, 0.02, 0.14, white, bay.x, 0.03, bay.z + bay.d / 2 - 0.07));
      this.group.add(box(0.14, 0.02, bay.d, white, bay.x - bay.w / 2 + 0.07, 0.03, bay.z));
      const mark = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 1.5),
        new THREE.MeshBasicMaterial({ map: accessMarkTexture(), transparent: true })
      );
      mark.rotation.x = -Math.PI / 2;
      mark.position.set(bay.x, 0.035, bay.z);
      this.group.add(mark);
      const postX = bay.x - bay.w / 2 - 0.35;
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 2.4, 8),
        this.materials.metal
      );
      post.position.set(postX, 1.2, bay.z);
      this.group.add(post);
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(0.7, 0.7),
        new THREE.MeshBasicMaterial({ map: accessMarkTexture(), side: THREE.DoubleSide })
      );
      sign.position.set(postX, 2.4, bay.z);
      this.group.add(sign);
      this.addCollider(postX - 0.08, postX + 0.08, bay.z - 0.08, bay.z + 0.08);
    }

    const charger = new THREE.Group();
    charger.add(box(0.7, 1.6, 0.5, sharedMaterial(0xd8dde0, { roughness: 0.5 }), 0, 0.8, 0));
    charger.add(box(0.5, 0.4, 0.02, sharedBasic(0x2f9fd0), 0, 1.15, 0.26));
    charger.position.set(EV_CHARGER.x, 0, EV_CHARGER.z);
    charger.rotation.y = EV_CHARGER.rot;
    this.group.add(charger);
    this.addCollider(
      EV_CHARGER.x - 0.35,
      EV_CHARGER.x + 0.35,
      EV_CHARGER.z - 0.35,
      EV_CHARGER.z + 0.35
    );

    // Paved path plus a low ramp link the lot to the sidewalk by the doors.
    const pathMat = sharedMaterial(0xffffff, { map: parkPathTexture(), roughness: 0.95 });
    this.group.add(
      plane(
        LOT_PATH.maxX - LOT_PATH.minX,
        LOT_PATH.maxZ - LOT_PATH.minZ,
        pathMat,
        (LOT_PATH.minX + LOT_PATH.maxX) / 2,
        0.05,
        (LOT_PATH.minZ + LOT_PATH.maxZ) / 2
      )
    );
    this.group.add(
      box(
        LOT_PATH.maxX - LOT_PATH.minX,
        0.1,
        2.2,
        sharedMaterial(0xa9a69a, { roughness: 0.9 }),
        (LOT_PATH.minX + LOT_PATH.maxX) / 2,
        0.05,
        LOT_PATH.maxZ - 1.1
      )
    );
  }

  buildPocketPark() {
    const p = POCKET_PARK;
    const cx = (p.minX + p.maxX) / 2;
    const cz = (p.minZ + p.maxZ) / 2;
    const grass = sharedMaterial(0xffffff, { map: grassTexture(), roughness: 1 });
    this.group.add(plane(p.maxX - p.minX, p.maxZ - p.minZ, grass, cx, 0.03, cz));
    const pathMat = sharedMaterial(0xffffff, { map: parkPathTexture(), roughness: 0.95 });
    this.group.add(plane(2.0, p.maxZ - p.minZ, pathMat, cx, 0.045, cz));
    this.group.add(plane(p.maxX - p.minX, 1.8, pathMat, cx, 0.045, cz));
    this.group.add(
      plane(
        POCKET_PARK_LINK.maxX - POCKET_PARK_LINK.minX,
        POCKET_PARK_LINK.maxZ - POCKET_PARK_LINK.minZ,
        pathMat,
        (POCKET_PARK_LINK.minX + POCKET_PARK_LINK.maxX) / 2,
        0.045,
        (POCKET_PARK_LINK.minZ + POCKET_PARK_LINK.maxZ) / 2
      )
    );

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(2.0, 0.18, 8, 24),
      sharedMaterial(0x9d9a8a, { roughness: 0.9 })
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(cx, 0.12, cz);
    this.group.add(rim);
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(1.95, 20),
      sharedMaterial(0x4c89a8, { transparent: true, opacity: 0.85, roughness: 0.2 })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(cx, 0.09, cz);
    this.group.add(water);
    this.addCollider(cx - 2.0, cx + 2.0, cz - 2.0, cz + 2.0);

    for (const [x, z, rot] of [
      [cx - 3.4, cz + 3.4, 0],
      [cx + 3.4, cz - 3.4, Math.PI]
    ]) {
      const bench = this.makeBenchFallback();
      bench.position.set(x, 0, z);
      bench.rotation.y = rot;
      this.group.add(bench);
      this.addCollider(x - 1.1, x + 1.1, z - 0.5, z + 0.5);
    }
  }

  // -------------------------------------------------------------------------
  // Signals and city navigation
  // -------------------------------------------------------------------------
  updateSignals(time) {
    if (!this.trafficLights.length) return;
    const phase = trafficPhase(time);
    const lit = { red: 0xff3b30, yellow: 0xffc21f, green: 0x34d058 };
    const dim = { red: 0x431410, yellow: 0x4a3a10, green: 0x104a18 };
    for (const tl of this.trafficLights) {
      if (!tl.lenses) continue;
      // Heads on the south sidewalk face the cross street, the northern ones
      // face Main Street.
      const axis = tl.group.position.z < MAIN_STREET.centerZ ? 'ew' : 'ns';
      const state = phase[axis];
      for (const key of ['red', 'yellow', 'green']) {
        const lens = tl.lenses[key];
        if (!lens?.material?.color) continue;
        lens.material.color.setHex(key === state ? lit[key] : dim[key]);
      }
    }
  }

  buildNav() {
    this.nav = new NavGrid({
      minX: CITY_BOUNDS.minX,
      maxX: CITY_BOUNDS.maxX,
      minZ: CITY_BOUNDS.minZ,
      maxZ: CITY_BOUNDS.maxZ,
      cell: 1,
      // City walkers are slimmer than the player; a smaller inflation keeps
      // 1 m cells from being swallowed around every kerbside prop.
      radius: 0.28,
      walkable: isWalkableGround,
      obstacles: this.colliders
    });
  }

  buildWaypoint() {
    const g = new THREE.Group();
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.55, 5, 10, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffd76b,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    beam.position.y = 2.5;
    g.add(beam);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.9, 0.09, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xffe08a })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.2;
    g.add(ring);
    g.visible = false;
    this.group.add(g);
    this.waypointBeacon = g;
  }

  registerCullGroups() {
    for (const shop of this.shops.values()) {
      const b = shop.business;
      this.cullGroups.push({
        object: shop.group,
        x: b.entrance.x,
        z: b.entrance.z + 6,
        radius: 64
      });
    }
  }
}
