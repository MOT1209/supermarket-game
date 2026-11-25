import * as THREE from 'three';
import { clamp } from '../utils/math.js';
import { movementToWorld } from '../core/controls.js';
import { cloneModel } from '../utils/AssetLoader.js';

export default class Player {
  constructor(game) {
    this.game = game;
    this.pos = new THREE.Vector3(0, 1.7, 5);
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.bob = 0;
    this.viewModel = null;
    this.attachViewModel();
  }

  attachViewModel() {
    // Non-arm parts are hidden so the model never blocks the centre of the view.
    cloneModel('player.glb').then(model => {
      if (!model) return;
      model.traverse(mesh => {
        if (mesh.isMesh && !mesh.name.startsWith('arm_')) mesh.visible = false;
      });
      model.scale.setScalar(0.9);
      model.rotation.x = -Math.PI / 2;
      model.position.set(0, -0.85, -1.0);
      this.game.camera.add(model);
      this.viewModel = model;
    }).catch(err => console.warn('[Player] Player GLB viewmodel skipped.', err));
  }

  update(dt) {
    const axes = this.game.input.getMoveAxes();
    const sprint = this.game.input.isSprinting();
    const speed = sprint ? 8.5 : 4.8;
    this.vel.set(axes.x, 0, axes.z);

    const { x: dx, z: dz } = movementToWorld(axes, this.yaw, speed, dt);
    if (!this.game.world.collides(this.pos.x + dx, this.pos.z)) this.pos.x += dx;
    if (!this.game.world.collides(this.pos.x, this.pos.z + dz)) this.pos.z += dz;
    this.pos.x = clamp(this.pos.x, -16, 16);
    this.pos.z = clamp(this.pos.z, -12, 20);

    const moving = axes.x * axes.x + axes.z * axes.z > 0.01;
    if (moving) this.bob += dt * (sprint ? 14 : 9);
    const y = 1.7 + (moving ? Math.sin(this.bob) * 0.035 : 0);
    if (this.viewModel) this.viewModel.position.y = -0.85 + (moving ? Math.sin(this.bob * 0.5) * 0.02 : 0);
    this.game.camera.position.set(this.pos.x, y, this.pos.z);
    this.game.camera.rotation.set(this.pitch, this.yaw, 0);

    const carried = this.game.runtime.carried;
    if (carried) {
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.game.camera.quaternion).multiplyScalar(1.3);
      carried.group.position.copy(this.game.camera.position).add(dir).add(new THREE.Vector3(0, -0.5, 0));
      carried.group.rotation.set(0, this.yaw, 0);
    }
  }
}
