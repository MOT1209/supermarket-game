import {
  PRODUCTS,
  LICENSES,
  BOX_COST_MULTIPLIER,
  maxSpots,
  WAGE_RESTOCKER,
  WAGE_CASHIER,
  RENT_PER_DAY,
  FRIDGE_UPKEEP
} from '../data/products.js';
import { MAX_STORE_LEVEL, expansionCost, nextFreeSpot, shelfDataFromSpot } from '../data/build.js';
import { rand, rounded } from '../utils/math.js';
import { createShelfMesh } from '../world/ShelfFactory.js';
import { spawnOneBox } from './DeliverySystem.js';

export function orderBox(game, pid) {
  const cost = rounded(game.state.prices[pid] * BOX_COST_MULTIPLIER);
  if (game.state.cash < cost) {
    game.ui.toast('Not enough cash');
    game.audio.play('error');
    return;
  }
  game.state.cash = rounded(game.state.cash - cost);
  game.runtime.stats.stockCost += cost;
  spawnOneBox(game, pid);
  game.audio.play('cash');
  game.ui.toast(`Ordered ${PRODUCTS[pid].name} box`);
  game.ui.updateHUD();
  game.save();
}

export function buyLicense(game, id) {
  const l = LICENSES.find((x) => x.id === id);
  if (!l || game.state.licenses.includes(id)) return;
  if (game.state.cash < l.cost) {
    game.ui.toast('Not enough cash');
    return;
  }
  game.state.cash = rounded(game.state.cash - l.cost);
  game.state.licenses.push(id);
  if (game.state.shelves.length < maxSpots(game.state.level)) {
    addShelf(game, l.product, PRODUCTS[l.product].cold);
  } else {
    game.ui.toast('License bought — buy a shelf to display it');
  }
  game.audio.play('success');
  game.ui.toast(`${l.name} unlocked!`);
  game.ui.updateHUD();
  game.save();
}

export function addShelf(game, pid, fridge) {
  if (game.state.shelves.length >= maxSpots(game.state.level)) return null;
  const spot = nextFreeSpot(game.state.level, game.runtime.shelves);
  if (spot < 0) return null;
  const shd = shelfDataFromSpot(spot, pid, { fridge });
  game.state.shelves.push({ ...shd });
  const group = createShelfMesh(shd, game);
  game.runtime.shelves.push({ ...shd, group });
  game.world.rebuildColliders();
  return shd;
}

export function buyFurniture(game, type) {
  const cost = type === 'shelf' ? 150 : 280;
  if (game.state.shelves.length >= maxSpots(game.state.level)) {
    game.ui.toast('Expand your store first');
    return;
  }
  if (game.state.cash < cost) {
    game.ui.toast('Not enough cash');
    return;
  }
  if (nextFreeSpot(game.state.level, game.runtime.shelves) < 0) {
    game.ui.toast('No free shelf spots');
    return;
  }
  const sel = document.getElementById('newShelfProduct');
  const requested = sel ? sel.value : 'milk';
  const pid =
    PRODUCTS[requested] &&
    (!PRODUCTS[requested].license || game.state.licenses.includes(PRODUCTS[requested].license))
      ? requested
      : Object.keys(PRODUCTS).find(
          (k) => !PRODUCTS[k].license || game.state.licenses.includes(PRODUCTS[k].license)
        );
  game.state.cash = rounded(game.state.cash - cost);
  if (!addShelf(game, pid, type === 'fridge')) {
    // Never keep the money when the shelf could not be placed.
    game.state.cash = rounded(game.state.cash + cost);
    game.ui.toast('No free shelf spots');
    return;
  }
  game.audio.play('cash');
  game.ui.toast(`${type === 'shelf' ? 'Shelf' : 'Refrigerator'} placed`);
  game.ui.updateHUD();
  game.save();
}

export function expandStore(game) {
  if (game.state.level >= MAX_STORE_LEVEL) {
    game.ui.toast('Your store is fully expanded');
    return;
  }
  const cost = expansionCost(game.state.level);
  if (game.state.cash < cost) {
    game.ui.toast('Not enough cash');
    return;
  }
  game.state.cash = rounded(game.state.cash - cost);
  game.state.level = Math.min(MAX_STORE_LEVEL, game.state.level + 1);
  game.world.rebuildStructure?.();
  game.world.rebuildColliders?.();
  game.audio.play('success');
  game.ui.toast(`Store expanded to level ${game.state.level}!`);
  game.ui.updateHUD();
  game.save(false, true);
}

export function hire(game, role) {
  const wage = role === 'restocker' ? WAGE_RESTOCKER : WAGE_CASHIER;
  if (game.state.cash < wage) {
    game.ui.toast('Not enough cash');
    return;
  }
  game.state.staff[role] = true;
  game.audio.play('success');
  game.ui.toast('Staff hired!');
  game.save();
}

export function setStoreName(game, name) {
  game.state.storeName = name;
  game.world.setStoreName(name);
  game.save();
  game.ui.toast('Sign updated');
}

export function fluctuatePrices(game) {
  for (const pid in PRODUCTS) {
    const old = game.state.prices[pid];
    const np = rounded(PRODUCTS[pid].price * rand(0.7, 1.3));
    game.state.prices[pid] = np;
    game.state.trends[pid] = np > old ? 1 : np < old ? -1 : 0;
  }
}

export function wages(game) {
  let w = 0;
  if (game.state.staff.restocker) w += WAGE_RESTOCKER;
  if (game.state.staff.cashier) w += WAGE_CASHIER;
  return w;
}

// Rent + per-fridge utilities, charged when the store closes.
export function operatingCost(game) {
  const fridges = game.state.shelves.filter((s) => s.fridge).length;
  return RENT_PER_DAY + fridges * FRIDGE_UPKEEP;
}
