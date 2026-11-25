import * as THREE from 'three';
import { clamp } from '../utils/math.js';

export default class Player {
  constructor(game) {
    this.game = game;
    this.pos = new THREE.Vector3(0, 1.7, 5);
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.bob = 0;
  }

  update(dt) {
    const keys = this.game.input.keys;
    if (keys['w'] || keys['arrowup']) this.vel.z -= 1;
    if (keys['s'] || keys['arrowdown']) this.vel.z += 1;
    if (keys['a'] || keys['arrowleft']) this.vel.x -= 1;
    if (keys['d'] || keys['arrowright']) this.vel.x += 1;
    const sprint = keys['shift'] || false;
    const speed = sprint ? 8.5 : 4.8;
    this.vel.clampLength(0, 1);

    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const dx = (this.vel.x * cos - this.vel.z * sin) * speed * dt;
    const dz = (this.vel.x * sin + this.vel.z * cos) * speed * dt;
    if (!this.game.world.collides(this.pos.x + dx, this.pos.z)) this.pos.x += dx;
    if (!this.game.world.collides(this.pos.x, this.pos.z + dz)) this.pos.z += dz;
    this.pos.x = clamp(this.pos.x, -16, 16);
    this.pos.z = clamp(this.pos.z, -12, 20);

    const moving = this.vel.lengthSq() > 0.01;
    if (moving) this.bob += dt * (sprint ? 14 : 9);
    const y = 1.7 + (moving ? Math.sin(this.bob) * 0.035 : 0);
    this.game.camera.position.set(this.pos.x, y, this.pos.z);
    this.game.camera.rotation.set(this.pitch, this.yaw, 0);
    this.vel.set(0, 0, 0);

    const carried = this.game.runtime.carried;
    if (carried) {
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.game.camera.quaternion).multiplyScalar(1.3);
      carried.group.position.copy(this.game.camera.position).add(dir).add(new THREE.Vector3(0, -0.5, 0));
      carried.group.rotation.set(0, this.yaw, 0);
    }
  }
}
