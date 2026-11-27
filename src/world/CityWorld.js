import * as THREE from 'three';
import { cloneModel } from '../utils/AssetLoader.js';
import { makeCanvas } from '../utils/textures.js';
import { disposeObject3D } from '../utils/dispose.js';
import {
  CITY_BOUNDS,
  MAIN_STREET,
  CROSS_STREETS,
  SIDEWALKS,
  PARKING_LOT,
  CITY_PARK,
  BUILDING_PLACEMENTS,
  STREETLIGHTS,
  TREES,
  BENCHES,
  PLANTERS,
  BINS,
  HYDRANTS,
  PARKED_CARS,
  TRAFFIC_LIGHTS,
  CITY_PROPS
} from '../data/city.js';
import { BUSINESSES, BUSINESS_LIST } from '../data/businesses.js';

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

function shopSignTexture(business) {
  return makeCanvas(
    (x, w, h) => {
      x.fillStyle = business.signColor;
      x.fillRect(0, 0, w, h);
      x.strokeStyle = 'rgba(255,255,255,.75)';
      x.lineWidth = 10;
      x.strokeRect(14, 14, w - 28, h - 28);
      x.fillStyle = '#fff7e8';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      let size = 92;
      x.font = `bold ${size}px Georgia, serif`;
      while (x.measureText(business.name).width > w - 70 && size > 34) {
        size -= 4;
        x.font = `bold ${size}px Georgia, serif`;
      }
      x.fillText(business.name, w / 2, h / 2 - 6);
      x.font = 'bold 26px Arial';
      x.fillStyle = 'rgba(255,255,255,.8)';
      x.fillText(business.tagline.slice(0, 54), w / 2, h / 2 + 54);
    },
    1024,
    256
  );
}

function shopFloorTexture(color) {
  return makeCanvas(
    (x, w, h) => {
      x.fillStyle = color;
      x.fillRect(0, 0, w, h);
      x.strokeStyle = 'rgba(0,0,0,.12)';
      x.lineWidth = 4;
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
    },
    256,
    256
  );
}

function shopMenuTexture(business) {
  return makeCanvas(
    (x, w, h) => {
      x.fillStyle = '#20301f';
      x.fillRect(0, 0, w, h);
      x.strokeStyle = '#d9c79a';
      x.lineWidth = 8;
      x.strokeRect(12, 12, w - 24, h - 24);
      x.fillStyle = '#f8eccb';
      x.font = 'bold 48px Georgia, serif';
      x.textAlign = 'center';
      x.fillText(business.shortName, w / 2, 82);
      x.font = '28px Arial';
      const lines = business.offers.slice(0, 3).map((o) => o.label);
      lines.forEach((line, i) => {
        x.fillStyle = '#e7d6a8';
        x.fillText(line, w / 2, 150 + i * 52);
        x.fillStyle = '#d9b65a';
        x.fillText('•', 34, 150 + i * 52);
      });
    },
    512,
    320
  );
}

export default class CityWorld {
  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    this.group.name = 'city';
    this.colliders = [];
    this.shops = new Map();
    this.trafficLights = [];
    this.cullGroups = [];
    this.shopLights = [];
    this.waypoint = null;
    this.waypointBeacon = null;
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
    this.buildBuildings();
    this.buildShops();
    this.buildProps();
    this.buildWaypoint();
    this.registerCullGroups();
  }

  collides(x, z, radius = 0.38) {
    for (const c of this.colliders) {
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
    this.colliders.push({ minX, maxX, minZ, maxZ });
  }

  setWaypoint(businessId) {
    const b = BUSINESSES[businessId];
    if (!b || !this.waypointBeacon) return false;
    this.waypoint = { businessId, x: b.entrance.x, z: b.entrance.z + 1.4 };
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

    // Zebra crossings at both intersections.
    const stripeGeo = new THREE.BoxGeometry(0.55, 0.02, 8.4);
    stripeGeo.userData.shared = true;
    for (const s of CROSS_STREETS) {
      for (let i = 0; i < 5; i++) {
        const z = MAIN_STREET.minZ + 0.9 + i * 1.85;
        const left = new THREE.Mesh(stripeGeo, dashMat);
        left.position.set(s.minX - 3.1, 0.035, z);
        this.group.add(left);
        const right = new THREE.Mesh(stripeGeo, dashMat);
        right.position.set(s.maxX + 3.1, 0.035, z);
        this.group.add(right);
      }
    }
  }

  buildSidewalks() {
    const mat = sharedMaterial(0xffffff, { map: sidewalkTexture(), roughness: 0.95 });
    for (const s of SIDEWALKS) {
      const w = s.maxX - s.minX;
      const d = s.maxZ - s.minZ;
      this.group.add(plane(w, d, mat, (s.minX + s.maxX) / 2, 0.04, (s.minZ + s.maxZ) / 2));
    }
    // Curb strips make the road edge readable.
    const curbMat = sharedMaterial(0x9a978c, { roughness: 0.9 });
    const addCurb = (x, z, w, d) => this.group.add(box(w, 0.14, d, curbMat, x, 0.07, z));
    addCurb(0, 19.95, 160, 0.18);
    addCurb(0, 30.05, 160, 0.18);
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
  }

  // -------------------------------------------------------------------------
  // Buildings
  // -------------------------------------------------------------------------
  buildBuildings() {
    for (const p of BUILDING_PLACEMENTS) {
      const fallback = this.makeBuildingFallback(p);
      this.group.add(fallback);
      this.fallbacks.set(`building_${p.x}_${p.z}`, fallback);
      this.addCollider(p.x - p.w / 2, p.x + p.w / 2, p.z - p.d / 2, p.z + p.d / 2);
      this.assetJobs.push(
        cloneModel(p.file).then((model) => {
          if (!model) return;
          model.position.set(p.x, 0, p.z);
          model.rotation.y = p.rot;
          model.traverse((o) => {
            if (o.isMesh) {
              o.castShadow = true;
              o.receiveShadow = true;
            }
          });
          this.group.add(model);
          this.group.remove(fallback);
          disposeObject3D(fallback);
          this.fallbacks.delete(`building_${p.x}_${p.z}`);
        })
      );
    }
  }

  makeBuildingFallback(p) {
    const g = new THREE.Group();
    const mat = sharedMaterial(p.color, { roughness: 0.85 });
    g.add(box(p.w, p.h, p.d, mat, p.x, p.h / 2, p.z));
    const roof = sharedMaterial(0x4d5355, { roughness: 0.95 });
    g.add(box(p.w + 0.2, 0.4, p.d + 0.2, roof, p.x, p.h + 0.2, p.z));
    const winMat = sharedBasic(0x3b596b);
    const winGeo = new THREE.BoxGeometry(0.8, 1.1, 0.06);
    winGeo.userData.shared = true;
    const rows = Math.max(1, Math.floor((p.h - 3) / 3));
    const cols = Math.max(2, Math.floor(p.w / 2.4));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const win = new THREE.Mesh(winGeo, winMat);
        win.position.set(
          p.x - p.w / 2 + 1.3 + c * ((p.w - 2.6) / Math.max(1, cols - 1)),
          3 + r * 3,
          p.z - p.d / 2 - 0.04
        );
        g.add(win);
      }
    }
    return g;
  }

  // -------------------------------------------------------------------------
  // Functional neighbour shops
  // -------------------------------------------------------------------------
  buildShops() {
    for (const b of BUSINESS_LIST) {
      const shop = { business: b, group: new THREE.Group(), lights: [] };
      shop.group.position.set(b.entrance.x, 0, b.entrance.z);
      this.group.add(shop.group);
      this.shops.set(b.id, shop);

      const fallback = this.makeShopFallback();
      shop.group.add(fallback);
      shop.fallback = fallback;
      this.assetJobs.push(
        cloneModel('city/shop_shell.glb').then((model) => {
          if (!model) return;
          model.position.set(0, 0, 6);
          model.rotation.y = Math.PI;
          model.traverse((o) => {
            if (o.isMesh) {
              o.castShadow = true;
              o.receiveShadow = true;
            }
          });
          shop.group.add(model);
          shop.group.remove(fallback);
          disposeObject3D(fallback);
          shop.fallback = null;
        })
      );

      this.buildShopInterior(b, shop);
      this.buildShopFacade(b, shop);
      this.addShopColliders(b);
    }
  }

  makeShopFallback() {
    const g = new THREE.Group();
    const wall = this.materials.wall;
    const roof = this.materials.roof;
    // Local space: entrance is at z=0, the shop extends away from the street.
    g.add(box(14, 4.6, 0.35, wall, 0, 2.3, 11.8));
    g.add(box(0.35, 4.6, 12, wall, -6.85, 2.3, 6));
    g.add(box(0.35, 4.6, 12, wall, 6.85, 2.3, 6));
    g.add(box(5.5, 4.6, 0.35, wall, -4.25, 2.3, 0.15));
    g.add(box(5.5, 4.6, 0.35, wall, 4.25, 2.3, 0.15));
    g.add(box(3, 2, 0.35, wall, 0, 3.6, 0.15));
    g.add(box(14.4, 0.35, 12.4, roof, 0, 4.78, 6));
    g.add(box(14, 0.2, 12, this.materials.wallDark, 0, 0.1, 6));
    return g;
  }

  buildShopInterior(b, shop) {
    const floorMat = sharedMaterial(0xffffff, {
      map: shopFloorTexture(
        b.id === 'cafe' ? '#8a6a4a' : b.id === 'bakery' ? '#b28a5a' : '#8a9a9a'
      ),
      roughness: 0.92
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(13.2, 11.2), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0.22, 6);
    floor.receiveShadow = true;
    shop.group.add(floor);

    const counterMat = sharedMaterial(b.accent, { roughness: 0.7 });
    const topMat = sharedMaterial(b.color, { roughness: 0.6 });
    const counter = new THREE.Group();
    counter.add(box(3.4, 1.0, 0.9, counterMat, 0, 0.5, 0));
    counter.add(box(3.6, 0.12, 1.05, topMat, 0, 1.06, 0));
    counter.position.set(b.counter.x - b.entrance.x, 0.22, b.counter.z - b.entrance.z);
    shop.group.add(counter);
    shop.counter = counter;
    this.game.world.tagInteract(counter, 'business', `Talk to ${b.shortName} — browse offers`);
    counter.userData.interact.businessId = b.id;

    // Back-wall shelves / display units.
    const shelfMat = sharedMaterial(0x5c4a38, { roughness: 0.88 });
    const goods = [b.color, b.awning, 0xd8c49a, 0x8fb3c4];
    for (let i = 0; i < 5; i++) {
      const x = -4.6 + i * 2.3;
      const z = 10.4;
      shop.group.add(box(1.8, 2.1, 0.55, shelfMat, x, 1.27, z));
      for (let row = 0; row < 2; row++) {
        shop.group.add(
          box(
            1.5,
            0.22,
            0.4,
            sharedMaterial(goods[(i + row) % goods.length]),
            x,
            0.75 + row * 0.7,
            z + 0.02
          )
        );
      }
    }

    // Side display counters.
    shop.group.add(box(0.7, 1.1, 5.2, shelfMat, -5.9, 0.77, 6.4));
    shop.group.add(box(0.7, 1.1, 5.2, shelfMat, 5.9, 0.77, 6.4));

    // Cafe seating / bakery baskets / pharmacy display.
    if (b.id === 'cafe') {
      for (const [tx, tz] of [
        [-3.2, 4.1],
        [3.2, 4.1]
      ]) {
        const table = new THREE.Group();
        table.add(box(1.1, 0.1, 1.1, topMat, 0, 0.85, 0));
        table.add(box(0.12, 0.75, 0.12, this.materials.metal, 0, 0.42, 0));
        table.position.set(tx, 0.22, tz);
        shop.group.add(table);
        for (const dx of [-0.85, 0.85]) {
          shop.group.add(box(0.5, 0.9, 0.5, sharedMaterial(0x3e4a42), tx + dx, 0.45, tz));
        }
      }
    } else if (b.id === 'bakery') {
      for (let i = 0; i < 3; i++) {
        shop.group.add(box(1.1, 0.35, 0.7, sharedMaterial(0xd9a441), -4 + i * 1.3, 0.42, 3.3));
      }
    } else {
      shop.group.add(box(2.4, 0.9, 1.2, sharedMaterial(0xdfe8e6), -3.6, 0.68, 3.2));
      shop.group.add(box(2.4, 0.9, 1.2, sharedMaterial(0xdfe8e6), 3.6, 0.68, 3.2));
    }

    // Keeper behind the counter, facing the street.
    const keeper = this.makeKeeper(b);
    keeper.position.set(b.keeper.x - b.entrance.x, 0.22, b.keeper.z - b.entrance.z);
    keeper.rotation.y = Math.PI;
    shop.group.add(keeper);

    // Menu board on the back wall.
    const menu = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 2),
      new THREE.MeshBasicMaterial({ map: shopMenuTexture(b) })
    );
    menu.position.set(0, 3.1, 11.45);
    menu.rotation.y = Math.PI;
    shop.group.add(menu);

    // Warm interior light, activated only near the shop.
    const light = new THREE.PointLight(0xffd9a0, 0, 18, 2);
    light.position.set(0, 3.5, 6);
    shop.group.add(light);
    this.shopLights.push({ light, x: b.entrance.x, z: b.entrance.z });
    shop.light = light;
  }

  makeKeeper(b) {
    const g = new THREE.Group();
    const skin = sharedMaterial(0xd9a578);
    const shirt = sharedMaterial(b.color);
    const apron = sharedMaterial(b.accent);
    const pants = sharedMaterial(0x2d3542);
    g.add(box(0.55, 0.8, 0.32, shirt, 0, 1.25, 0));
    g.add(box(0.6, 0.35, 0.34, apron, 0, 1.05, 0.02));
    g.add(box(0.48, 0.7, 0.28, pants, 0, 0.45, 0));
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 10), skin);
    head.position.set(0, 1.83, 0);
    head.castShadow = true;
    g.add(head);
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.215, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6),
      sharedMaterial(0x3a2a20)
    );
    hair.position.set(0, 1.85, -0.01);
    g.add(hair);
    g.add(box(0.18, 0.6, 0.16, shirt, -0.34, 1.2, 0));
    g.add(box(0.18, 0.6, 0.16, shirt, 0.34, 1.2, 0));
    return g;
  }

  buildShopFacade(b, shop) {
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(7.4, 1.85),
      new THREE.MeshBasicMaterial({ map: shopSignTexture(b) })
    );
    sign.position.set(0, 3.65, -0.16);
    sign.rotation.y = Math.PI;
    shop.group.add(sign);

    const awningMat = sharedMaterial(b.awning, { roughness: 0.85 });
    const awning = box(7.8, 0.18, 1.6, awningMat, 0, 2.95, -0.85);
    awning.rotation.x = 0.12;
    shop.group.add(awning);
    for (let i = -3; i <= 3; i++) {
      shop.group.add(box(0.08, 0.3, 1.5, this.materials.white, i * 1.1, 2.88, -0.9));
    }

    const mat = sharedMaterial(b.color, { roughness: 0.8 });
    shop.group.add(box(0.45, 4.6, 0.45, mat, -6.6, 2.3, -0.2));
    shop.group.add(box(0.45, 4.6, 0.45, mat, 6.6, 2.3, -0.2));
  }

  addShopColliders(b) {
    // Walls (entrance gap x -1.5..1.5 at the front).
    this.addCollider(b.building.minX, b.building.maxX, b.building.maxZ - 0.4, b.building.maxZ);
    this.addCollider(b.building.minX, b.building.minX + 0.4, b.building.minZ, b.building.maxZ);
    this.addCollider(b.building.maxX - 0.4, b.building.maxX, b.building.minZ, b.building.maxZ);
    this.addCollider(b.building.minX, b.entrance.x - 1.5, b.building.minZ, b.building.minZ + 0.4);
    this.addCollider(b.entrance.x + 1.5, b.building.maxX, b.building.minZ, b.building.minZ + 0.4);
    // Counter and side displays.
    this.addCollider(b.counter.x - 1.8, b.counter.x + 1.8, b.counter.z - 0.55, b.counter.z + 0.55);
    this.addCollider(
      b.building.minX + 0.3,
      b.building.minX + 1.2,
      b.building.minZ + 2,
      b.building.maxZ - 1
    );
    this.addCollider(
      b.building.maxX - 1.2,
      b.building.maxX - 0.3,
      b.building.minZ + 2,
      b.building.maxZ - 1
    );
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
      const mat = sharedBasic(color);
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
