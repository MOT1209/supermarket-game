import * as THREE from 'three';
import { PRODUCTS, RECYCLE_BONUS } from '../data/products.js';
import { rounded } from '../utils/math.js';
import { shelfPrompt, refreshShelfVisual } from '../world/ShelfFactory.js';
import { convertToTrash, removeBox, updateBoxLabel } from './DeliverySystem.js';
import { waitingCustomer } from '../entities/Customer.js';
import { BUSINESSES } from '../data/businesses.js';

const raycaster = new THREE.Raycaster();
const dir = new THREE.Vector3();

export function findInteract(game) {
  dir.set(0, 0, -1).applyQuaternion(game.camera.quaternion);
  raycaster.set(game.camera.position, dir);
  raycaster.far = 3.5;
  const hits = raycaster.intersectObjects(game.world.interactables, true);
  for (const h of hits) {
    let o = h.object;
    while (o && !o.userData.interact) o = o.parent;
    if (o) return o;
  }
  return null;
}

export function interact(game) {
  const o = findInteract(game);
  if (!o) return;
  const it = o.userData.interact;

  if (it.type === 'terminal') {
    game.ui.openTerminal();
    return;
  }

  if (it.type === 'register') {
    const c = waitingCustomer(game);
    if (c) game.checkout.open(c);
    else game.ui.toast('No customer waiting');
    return;
  }

  if (it.type === 'dumpster') {
    const carried = game.runtime.carried;
    if (carried && carried.trash) {
      removeBox(game, carried);
      game.runtime.carried = null;
      game.state.cash = rounded(game.state.cash + RECYCLE_BONUS);
      game.runtime.stats.recycle += RECYCLE_BONUS;
      game.audio.play('coin');
      game.ui.toast(`♻ +$${RECYCLE_BONUS.toFixed(2)} recycling bonus`);
      game.ui.updateHUD();
      game.save();
    } else {
      game.ui.toast('Bring empty trash boxes here');
    }
    return;
  }

  if (it.type === 'box') {
    if (game.runtime.carried) {
      game.ui.toast('Hands full');
      return;
    }
    const b = game.runtime.boxes.find((x) => x.group === o);
    if (!b) return;
    game.runtime.carried = b;
    b.group.position.set(0, 0, 0);
    b.group.rotation.set(0, 0, 0);
    game.world.interactables = game.world.interactables.filter((x) => x !== b.group);
    game.audio.play('pick');
    return;
  }

  if (it.type === 'business') {
    const bid = o.userData?.interact?.businessId;
    if (bid && BUSINESSES[bid]) {
      game.ui.shopUI?.show?.(bid);
    } else {
      game.ui.toast('This shop is closed.');
    }
    return;
  }

  if (it.type === 'shelf') {
    const sh = game.runtime.shelves.find((s) => s.group === o);
    if (!sh) return;
    const carried = game.runtime.carried;
    if (carried && !carried.trash) {
      if (carried.productId !== sh.productId) {
        game.ui.toast('Wrong product for this shelf');
        return;
      }
      const add = Math.min(carried.qty, sh.capacity - sh.stock);
      if (add <= 0) {
        game.ui.toast('Shelf is full');
        return;
      }
      sh.stock += add;
      carried.qty -= add;
      refreshShelfVisual(sh.spot, sh.group, sh, game);
      game.syncShelfData();
      game.audio.play('place');
      if (carried.qty <= 0) {
        convertToTrash(game, carried);
        game.ui.toast('Box empty — take to dumpster');
      } else {
        updateBoxLabel(game, carried);
        game.ui.toast(`Stocked ${add} ${PRODUCTS[carried.productId].name}`);
      }
      game.save();
    } else if (carried && carried.trash) {
      game.ui.toast('Take trash to the dumpster');
    } else {
      game.ui.toast(`${PRODUCTS[sh.productId].name}: ${sh.stock}/${sh.capacity}`);
    }
    updatePrompt(game, o);
  }
}

export function updatePrompt(game, o) {
  if (!o) {
    game.ui.setPrompt('');
    return;
  }
  let txt = o.userData.interact.prompt;
  if (o.userData.interact.type === 'shelf') {
    const sh = game.runtime.shelves.find((s) => s.group === o);
    if (sh) txt = shelfPrompt(sh);
  } else if (o.userData.interact.type === 'box') {
    const b = game.runtime.boxes.find((x) => x.group === o);
    if (b)
      txt = b.trash
        ? 'Empty box — carry to dumpster'
        : `${PRODUCTS[b.productId].name} box (${b.qty}) — E to pick up`;
  }
  game.ui.setPrompt(`[E] ${txt}`);
}
