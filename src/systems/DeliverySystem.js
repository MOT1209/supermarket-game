import * as THREE from 'three';
import { PRODUCTS } from '../data/products.js';
import { pick, rand } from '../utils/math.js';
import { labelTexture } from '../utils/textures.js';
import { boxMesh } from '../utils/meshes.js';

function makeBox(game, pid, pos) {
  const g = new THREE.Group();
  const b = boxMesh(0.9, 0.7, 0.9, 0xb98a4f); b.position.y = 0.35; g.add(b);
  const tape = boxMesh(0.12, 0.72, 0.92, 0xddc08a); tape.position.y = 0.35; g.add(tape);
  const lbl = new THREE.Mesh(
    new THREE.PlaneGeometry(0.6, 0.3),
    new THREE.MeshBasicMaterial({ map: labelTexture(PRODUCTS[pid].name, PRODUCTS[pid].color) })
  );
  lbl.position.set(0, 0.42, 0.46); g.add(lbl);
  g.position.copy(pos);
  game.scene.add(g);
  const box = { group: g, productId: pid, qty: 0, trash: false };
  g.userData.interact = { type: 'box', prompt: '' };
  game.world.interactables.push(g);
  game.runtime.boxes.push(box);
  return box;
}

export function createBox(game, pid, qty, pos) {
  const box = makeBox(game, pid, pos);
  box.qty = qty;
  updateBoxLabel(game, box);
  return box;
}

export function updateBoxLabel(game, box) {
  const lbl = box.group.children.find(c => c.geometry && c.geometry.type === 'PlaneGeometry');
  if (lbl) {
    lbl.material.map.dispose();
    lbl.material.map = labelTexture(PRODUCTS[box.productId].name, PRODUCTS[box.productId].color);
    lbl.material.needsUpdate = true;
  }
  box.group.userData.interact.prompt = box.trash
    ? 'Empty box — carry to dumpster'
    : `${PRODUCTS[box.productId].name} box (${box.qty}) — E to pick up`;
}

export function rebuildBoxLabel(game, box) { updateBoxLabel(game, box); }

export function removeBox(game, box) {
  game.scene.remove(box.group);
  game.world.interactables = game.world.interactables.filter(o => o !== box.group);
  game.runtime.boxes = game.runtime.boxes.filter(b => b !== box);
  if (game.runtime.boxes.length === 0) {
    game.world.beacon.visible = false;
    game.world.beaconLight.intensity = 0;
  }
}

export function showBeacon(game) {
  game.world.beacon.visible = true;
  game.world.beaconLight.intensity = 1.2;
}

export function convertToTrash(game, box) {
  box.trash = true;
  box.group.children.forEach(c => {
    if (c.material && c.material.color) c.material.color.multiplyScalar(0.65);
  });
  box.group.scale.y = 0.35;
  updateBoxLabel(game, box);
}

export function spawnDelivery(game) {
  const count = 2 + Math.min(3, Math.floor(game.state.day / 2));
  for (let i = 0; i < count; i++) {
    const shd = pick(game.state.shelves);
    createBox(game, shd.productId, Math.floor(rand(4, 9)), new THREE.Vector3(-2.4 + i * 1.8, 0, 16.6));
  }
  showBeacon(game);
  game.audio.play('delivery');
  game.ui.toast('📦 New delivery arrived outside!');
}

export function spawnOneBox(game, pid) {
  createBox(game, pid, Math.floor(rand(4, 9)), new THREE.Vector3(rand(-3, 3), 0, 17));
  showBeacon(game);
}
