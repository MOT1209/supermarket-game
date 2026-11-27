import * as THREE from 'three';
import { clamp } from '../utils/math.js';
import { movementToWorld } from '../core/controls.js';
import { cloneCharacter, cloneModel } from '../utils/AssetLoader.js';
import { safeCameraDistance } from '../utils/camera.js';
import { CITY_BOUNDS } from '../data/city.js';

const VIEW_MODES = new Set(['first', 'shoulder', 'third']);
const BODY_FILES = {
  male: 'customers/male_customer_04.glb',
  female: 'customers/female_customer_04.glb'
};
const BODY_CLIPS = new Set(['Idle', 'Walk', 'Run']);

export default class Player {
  constructor(game) {
    this.game = game;
    this.pos = new THREE.Vector3(0, 1.7, 5);
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.bob = 0;
    this.sway = 0;
    this.viewModel = null;
    this.viewKind = null;
    this.viewToken = 0;
    this.body = null;
    this.bodyKind = null;
    this.bodyToken = 0;
    this.bodyMixer = null;
    this.bodyActions = {};
    this.bodyAnim = null;
    this.view = VIEW_MODES.has(game.state.viewMode) ? game.state.viewMode : 'first';
    const model = game.state.playerModel === 'female' ? 'female' : 'male';
    this.attachViewModel(model);
    this.attachBody(model);
    // The menu renders before update() runs, so put the camera in the saved
    // view right away instead of starting inside the avatar's head.
    this.updateCamera(1.7);
  }

  attachViewModel(kind = 'male') {
    const modelKind = kind === 'female' ? 'female' : 'male';
    const token = ++this.viewToken;
    cloneModel(`player_${modelKind}.glb`)
      .then((model) => {
        if (!model || token !== this.viewToken) return;
        this.detachViewModel();
        model.traverse((mesh) => {
          if (!mesh.isMesh) return;
          // Camera-mounted hands sit at the frame edge; culling them away
          // because of a stale bounding sphere would look like missing arms.
          mesh.frustumCulled = false;
          mesh.castShadow = false;
          mesh.receiveShadow = false;
        });
        this.game.camera.add(model);
        this.viewModel = model;
        this.viewKind = modelKind;
        this.applyViewVisibility();
      })
      .catch((err) => console.warn('[Player] Player viewmodel skipped.', err));
  }

  detachViewModel() {
    if (!this.viewModel) return;
    this.viewModel.removeFromParent();
    this.viewModel = null;
    this.viewKind = null;
  }

  attachBody(kind = 'male') {
    const modelKind = kind === 'female' ? 'female' : 'male';
    const token = ++this.bodyToken;
    cloneCharacter(BODY_FILES[modelKind])
      .then((model) => {
        if (!model || token !== this.bodyToken) return;
        this.detachBody();
        model.traverse((mesh) => {
          if (!mesh.isMesh) return;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        });
        this.game.scene.add(model);
        this.body = model;
        this.bodyKind = modelKind;
        this.bodyMixer = new THREE.AnimationMixer(model);
        this.bodyActions = {};
        for (const clip of model.userData.animations || []) {
          if (BODY_CLIPS.has(clip.name))
            this.bodyActions[clip.name] = this.bodyMixer.clipAction(clip);
        }
        this.bodyAnim = null;
        this.playBody('Idle');
        this.applyViewVisibility();
        this.syncBody(0, false, false);
      })
      .catch((err) => console.warn('[Player] Player body skipped.', err));
  }

  detachBody() {
    if (!this.body) return;
    this.bodyMixer?.stopAllAction();
    this.body.removeFromParent();
    this.body = null;
    this.bodyKind = null;
    this.bodyMixer = null;
    this.bodyActions = {};
    this.bodyAnim = null;
  }

  setPlayerModel(kind) {
    this.attachViewModel(kind);
    this.attachBody(kind);
  }

  setView(mode) {
    const next = VIEW_MODES.has(mode) ? mode : 'first';
    if (next === this.view) return;
    this.view = next;
    this.applyViewVisibility();
    this.updateCamera(1.7);
  }

  applyViewVisibility() {
    if (this.viewModel) this.viewModel.visible = this.view === 'first';
    if (this.body) this.body.visible = this.view !== 'first';
  }

  playBody(name) {
    const next = this.bodyActions[name];
    if (!next || name === this.bodyAnim) return;
    const prev = this.bodyActions[this.bodyAnim];
    if (prev) prev.fadeOut(0.2);
    next.reset().fadeIn(0.2).play();
    this.bodyAnim = name;
  }

  syncBody(dt, moving, sprint) {
    if (!this.body) return;
    this.body.position.set(this.pos.x, 0, this.pos.z);
    this.body.rotation.y = this.yaw + Math.PI;
    if (this.view === 'first') return;
    this.playBody(!moving ? 'Idle' : sprint ? 'Run' : 'Walk');
    this.bodyMixer.update(dt);
  }

  updateCamera(eyeY) {
    const camera = this.game.camera;
    if (this.view === 'first') {
      camera.position.set(this.pos.x, eyeY, this.pos.z);
      camera.rotation.set(this.pitch, this.yaw, 0);
      return;
    }

    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const shoulder = this.view === 'shoulder';
    const distance = shoulder ? 0.75 : 3.2;
    const side = shoulder ? 0.5 : 0;
    const height = shoulder ? 1.78 : 2.15;
    const lookAhead = shoulder ? 2.6 : 2;
    const pitchReach = shoulder ? 2.6 : 3.2;

    const offsetX = right.x * side - forward.x * distance;
    const offsetZ = right.z * side - forward.z * distance;
    let camX = this.pos.x + offsetX;
    let camZ = this.pos.z + offsetZ;
    if (!shoulder) {
      // Chase camera: stop before the first full-height wall instead of
      // letting the view pass through it.
      const allowed = safeCameraDistance(this.pos.x, this.pos.z, offsetX, offsetZ, (x, z) =>
        this.cameraBlocked(x, z)
      );
      const length = Math.hypot(offsetX, offsetZ);
      const scale = length > 0 ? allowed / length : 1;
      camX = this.pos.x + offsetX * scale;
      camZ = this.pos.z + offsetZ * scale;
    }
    camera.position.set(camX, height, camZ);
    camera.lookAt(
      this.pos.x + forward.x * lookAhead + right.x * (shoulder ? 0.15 : 0),
      (shoulder ? 1.42 : 1.35) + Math.tan(this.pitch) * pitchReach,
      this.pos.z + forward.z * lookAhead + right.z * (shoulder ? 0.15 : 0)
    );
  }

  cameraBlocked(x, z) {
    if (this.game.world?.cameraCollides?.(x, z)) return true;
    return this.game.city?.collides?.(x, z, 0.16) || false;
  }

  updateCarried() {
    const carried = this.game.runtime.carried;
    if (!carried) return;
    if (this.view === 'first') {
      const dir = new THREE.Vector3(0, 0, -1)
        .applyQuaternion(this.game.camera.quaternion)
        .multiplyScalar(1.3);
      carried.group.position
        .copy(this.game.camera.position)
        .add(dir)
        .add(new THREE.Vector3(0, -0.5, 0));
      carried.group.rotation.set(0, this.yaw, 0);
      return;
    }
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    carried.group.position.set(this.pos.x + forward.x * 0.55, 1.05, this.pos.z + forward.z * 0.55);
    carried.group.rotation.set(0, this.yaw, 0);
  }

  update(dt) {
    const axes = this.game.input.getMoveAxes();
    const sprint = this.game.input.isSprinting();
    const boost = this.game.runtime.boost;
    const boostActive = boost && boost.until > performance.now();
    if (boost && !boostActive) this.game.runtime.boost = null;
    const speed = (sprint ? 8.5 : 4.8) * (boostActive ? boost.multiplier : 1);
    this.vel.set(axes.x, 0, axes.z);

    const { x: dx, z: dz } = movementToWorld(axes, this.yaw, speed, dt);
    const collides =
      this.game.collides?.bind(this.game) || ((x, z) => this.game.world.collides(x, z));
    if (!collides(this.pos.x + dx, this.pos.z)) this.pos.x += dx;
    if (!collides(this.pos.x, this.pos.z + dz)) this.pos.z += dz;
    this.pos.x = clamp(this.pos.x, CITY_BOUNDS.minX, CITY_BOUNDS.maxX);
    this.pos.z = clamp(this.pos.z, CITY_BOUNDS.minZ, CITY_BOUNDS.maxZ);

    const moving = axes.x * axes.x + axes.z * axes.z > 0.01;
    if (moving) this.bob += dt * (sprint ? 14 : 9);
    this.sway += dt;
    const eyeY = 1.7 + (moving ? Math.sin(this.bob) * 0.035 : 0);
    if (this.viewModel) {
      this.viewModel.position.y =
        Math.sin(this.sway * 1.7) * 0.003 + (moving ? Math.sin(this.bob * 0.5) * 0.012 : 0);
      this.viewModel.position.x = Math.cos(this.sway * 0.9) * 0.002;
    }
    this.updateCamera(eyeY);
    this.syncBody(dt, moving, sprint);
    this.updateCarried();
  }
}
