import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import Game from '../src/core/Game.js';
import { waitingCustomer } from '../src/entities/Customer.js';
import { findInteract } from '../src/systems/Interaction.js';

test('waitingCustomer ignores shoppers still walking to the till', () => {
  const walking = { state: 'queue', queueIndex: 0 };
  const game = { runtime: { customers: [walking, { state: 'wait', queueIndex: 1 }] } };
  assert.equal(waitingCustomer(game), null);

  const atTill = { state: 'wait', queueIndex: 0 };
  game.runtime.customers.push(atTill);
  assert.equal(waitingCustomer(game), atTill);
});

function dropGame(collides) {
  const toasts = [];
  const group = new THREE.Group();
  const game = {
    camera: new THREE.PerspectiveCamera(),
    player: { pos: new THREE.Vector3(0, 1.7, 5), yaw: 0 },
    runtime: { carried: { group, trash: false, productId: 'milk', qty: 2 } },
    world: { interactables: [] },
    audio: { play() {} },
    ui: { toast: (msg) => toasts.push(msg) },
    collides
  };
  return { game, toasts, group };
}

test('onDrop refuses to bury a box inside a wall', () => {
  const { game, toasts, group } = dropGame(() => true);
  Game.prototype.onDrop.call(game);
  assert.equal(game.runtime.carried.group, group, 'box stays in hand');
  assert.deepEqual([group.position.x, group.position.z], [0, 0]);
  assert.equal(game.world.interactables.length, 0);
  assert.equal(toasts.length, 1);
});

test('onDrop places the box in front when the spot is free', () => {
  const { game, group } = dropGame(() => false);
  Game.prototype.onDrop.call(game);
  assert.equal(game.runtime.carried, null);
  assert.equal(game.world.interactables.length, 1);
  assert.ok(Math.abs(group.position.z - 3.8) < 1e-6, `dropped at z=${group.position.z}`);
});

test('the primary action places while building and interacts otherwise', () => {
  const calls = [];
  const game = {
    buildSystem: {
      enabled: true,
      confirmPlace: () => calls.push('place')
    },
    onInteract: () => calls.push('interact')
  };

  Game.prototype.onPrimaryAction.call(game);
  game.buildSystem.enabled = false;
  Game.prototype.onPrimaryAction.call(game);

  assert.deepEqual(calls, ['place', 'interact']);
});

test('Escape cancels a build move, then leaves build mode, then pauses', () => {
  const calls = [];
  const build = {
    enabled: true,
    moveTarget: { kind: 'fixture', id: 'plant_1' },
    cancel: () => calls.push('cancel'),
    stop: () => calls.push('stop')
  };
  const game = {
    mode: 'playing',
    runtime: { checkoutCustomer: null },
    ui: {
      shopUI: { isOpen: () => false },
      el: { terminalOverlay: { classList: { contains: () => false } } }
    },
    buildSystem: build,
    input: {
      justUnlocked: () => false,
      restoreLockOrPause: () => calls.push('relock')
    },
    pauseGame: () => calls.push('pause')
  };

  Game.prototype.onEscape.call(game);
  assert.deepEqual(calls, ['cancel', 'relock']);

  build.moveTarget = null;
  Game.prototype.onEscape.call(game);
  assert.deepEqual(calls, ['cancel', 'relock', 'stop', 'relock']);

  build.enabled = false;
  Game.prototype.onEscape.call(game);
  assert.deepEqual(calls, ['cancel', 'relock', 'stop', 'relock', 'pause']);
});

test('Escape cancels an open checkout instead of doing nothing', () => {
  let cancelled = 0;
  const game = {
    mode: 'modal',
    runtime: { checkoutCustomer: { id: 'c1' } },
    ui: {
      shopUI: { isOpen: () => false },
      el: { terminalOverlay: { classList: { contains: () => false } } }
    },
    input: { justUnlocked: () => false },
    checkout: {
      cancel() {
        cancelled++;
      }
    },
    pauseGame() {
      throw new Error('must not pause');
    },
    resumeGame() {
      throw new Error('must not resume');
    }
  };
  Game.prototype.onEscape.call(game);
  assert.equal(cancelled, 1);
});

function makeWall(visible = true) {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 0.3), new THREE.MeshBasicMaterial());
  wall.position.set(0, 1.5, -1);
  wall.visible = visible;
  wall.updateMatrixWorld(true);
  return wall;
}

// The prop sits 2 m ahead; an optional wall sits at 1 m on the same line.
function reachGame({ wall = null, wallVisible = true } = {}) {
  const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 200);
  camera.rotation.order = 'YXZ';
  camera.position.set(0, 1.7, 0);
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  shelf.position.set(0, 1.7, -2);
  shelf.userData.interact = { type: 'shelf', prompt: 'Stock' };
  shelf.updateMatrixWorld(true);

  const game = { camera, world: { interactables: [shelf], structure: null, shell: null } };
  if (wall === 'store') {
    game.world.structure = new THREE.Group();
    game.world.structure.add(makeWall(wallVisible));
    game.world.structure.updateMatrixWorld(true);
  } else if (wall === 'shop') {
    game.city = { shopWorld: { wallMeshes: [makeWall(wallVisible)] } };
  }
  return { game, shelf };
}

test('findInteract reaches a shelf with nothing in between', () => {
  const { game, shelf } = reachGame();
  assert.equal(findInteract(game), shelf);
});

test('findInteract refuses a shelf hidden behind the supermarket shell', () => {
  const { game } = reachGame({ wall: 'store' });
  assert.equal(findInteract(game), null);
});

test('findInteract refuses a counter hidden behind a shop wall', () => {
  const { game } = reachGame({ wall: 'shop' });
  assert.equal(findInteract(game), null);
});

test('findInteract ignores a hidden wall', () => {
  const { game, shelf } = reachGame({ wall: 'store', wallVisible: false });
  assert.equal(findInteract(game), shelf);
});
