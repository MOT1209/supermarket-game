import * as THREE from 'three';
import { PEDESTRIAN_ROUTES, CAR_ROUTES } from '../data/city.js';
import { makeCustomerModel } from '../entities/CustomerModel.js';

function rand(a, b) {
  return a + Math.random() * (b - a);
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default class CityLife {
  constructor(game, cityWorld) {
    this.game = game;
    this.city = cityWorld;
    this.peds = [];
    this.cars = [];
    this.active = true;
    this._spawnTimer = 0;
    this._carTimer = 0;
  }

  build() {
    // spawn some initial pedestrians
    for (let i = 0; i < 6; i++) this.spawnPed();
    for (let i = 0; i < 3; i++) this.spawnCar();
  }

  spawnPed() {
    if (this.peds.length >= 10) return;
    const route = pick(PEDESTRIAN_ROUTES);
    if (!route || route.length < 2) return;
    const model = makeCustomerModel();
    const g = model.root;
    const startIdx = Math.floor(Math.random() * route.length);
    const p = route[startIdx];
    g.position.set(p.x + rand(-0.3, 0.3), 0, p.z + rand(-0.3, 0.3));
    this.city.group.add(g);
    this.peds.push({
      group: g,
      rig: model.rig,
      armL: model.armL,
      armR: model.armR,
      legL: model.legL,
      legR: model.legR,
      route,
      idx: startIdx,
      speed: rand(0.8, 1.4),
      phase: rand(0, 6),
      moving: true
    });
  }

  spawnCar() {
    if (this.cars.length >= 4) return;
    const route = pick(CAR_ROUTES);
    if (!route) return;
    const color = route.file.includes('red')
      ? 0xb33b3b
      : route.file.includes('blue')
        ? 0x3b5fb3
        : route.file.includes('taxi')
          ? 0xd9b23a
          : 0x8a8f94;
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.55, 3.7),
      new THREE.MeshStandardMaterial({ color, metalness: 0.35, roughness: 0.4 })
    );
    body.position.y = 0.62;
    g.add(body);
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(1.55, 0.65, 1.9),
      new THREE.MeshStandardMaterial({ color: 0x22303a, roughness: 0.2 })
    );
    top.position.set(0, 1.25, 0.1);
    g.add(top);
    const start = route.axis === 'x' ? route.from : route.lane;
    const zOrX = route.axis === 'x' ? route.lane : route.from;
    if (route.axis === 'x') g.position.set(start, 0, zOrX);
    else g.position.set(zOrX, 0, start);
    g.rotation.y =
      route.axis === 'x'
        ? route.direction > 0
          ? Math.PI / 2
          : -Math.PI / 2
        : route.direction > 0
          ? 0
          : Math.PI;
    this.city.group.add(g);
    this.cars.push({ group: g, route, t: 0 });
  }

  update(dt) {
    const player = this.game.player?.pos;
    const active = !player || (Math.abs(player.x) < 90 && Math.abs(player.z) < 80);
    this.active = active;
    if (!active) return;

    this._spawnTimer += dt;
    if (this._spawnTimer > 4) {
      this._spawnTimer = 0;
      this.spawnPed();
    }
    this._carTimer += dt;
    if (this._carTimer > 6) {
      this._carTimer = 0;
      this.spawnCar();
    }

    // update peds
    for (let i = this.peds.length - 1; i >= 0; i--) {
      const p = this.peds[i];
      const route = p.route;
      const nextIdx = (p.idx + 1) % route.length;
      const target = route[nextIdx];
      const dx = target.x - p.group.position.x;
      const dz = target.z - p.group.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.3) {
        p.idx = nextIdx;
      } else {
        const step = Math.min(dist, p.speed * dt);
        p.group.position.x += (dx / dist) * step;
        p.group.position.z += (dz / dist) * step;
        p.group.rotation.y = Math.atan2(dx, dz);
        p.moving = true;
      }
      p.phase += dt * (p.moving ? 8 : 2);
      if (p.rig) {
        const sw = Math.sin(p.phase);
        if (p.armL) p.armL.rotation.x = sw * 0.35;
        if (p.armR) p.armR.rotation.x = -sw * 0.35;
        if (p.legL) p.legL.rotation.x = -sw * 0.4;
        if (p.legR) p.legR.rotation.x = sw * 0.4;
        p.rig.position.y = Math.abs(sw) * 0.02;
      }
      p.moving = false;
    }

    // update cars (simple loop along route)
    for (let i = this.cars.length - 1; i >= 0; i--) {
      const c = this.cars[i];
      const r = c.route;
      c.t += dt * r.speed * (r.direction > 0 ? 1 : -1);
      let pos = r.from + c.t;
      if (r.direction > 0 && pos > r.to) {
        pos = r.from;
        c.t = 0;
      }
      if (r.direction < 0 && pos < r.to) {
        pos = r.from;
        c.t = 0;
      }
      if (r.axis === 'x') {
        c.group.position.x = pos;
        c.group.position.z = r.lane;
      } else {
        c.group.position.x = r.lane;
        c.group.position.z = pos;
      }
    }
  }
}
