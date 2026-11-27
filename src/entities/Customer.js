import * as THREE from 'three';
import { MAX_CUSTOMERS, CATEGORIES, PRODUCTS } from '../data/products.js';
import { pick, rand, rounded } from '../utils/math.js';
import { emojiTexture } from '../utils/textures.js';
import { currentSellPrice } from '../systems/Pricing.js';
import { onHappyCustomer, onAngryCustomer } from '../systems/Reputation.js';
import { makeCustomerModel, animateCustomer } from './CustomerModel.js';
import { refreshShelfVisual } from '../world/ShelfFactory.js';

function makeEmoji() {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: emojiTexture('😊'),
      transparent: true,
      depthTest: false
    })
  );
  s.scale.set(0.9, 0.9, 1);
  s.position.y = 2.5;
  s.visible = false;
  return s;
}

function disposeGroup(group) {
  group.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if (m.map) m.map.dispose();
        m.dispose();
      });
    }
  });
}

export function showEmoji(c, emoji, sec = 2.2) {
  c.emoji.material.map.dispose();
  c.emoji.material.map = emojiTexture(emoji);
  c.emoji.material.needsUpdate = true;
  c.emoji.visible = true;
  c.emojiTimer = sec;
}

export function spawnCustomer(game) {
  if (game.runtime.customers.length >= MAX_CUSTOMERS) return;
  const model = makeCustomerModel();
  const g = model.root;
  const emoji = makeEmoji();
  g.add(emoji);
  g.position.set(rand(-1, 1), 0, 16);
  g.scale.setScalar(rand(0.92, 1.08));
  game.scene.add(g);
  game.runtime.customers.push({
    group: g,
    rig: model.rig,
    armL: model.armL,
    armR: model.armR,
    legL: model.legL,
    legR: model.legR,
    emoji,
    state: 'enter',
    timer: 0,
    basket: [],
    queueIndex: -1,
    emojiTimer: 0,
    visits: 0,
    moving: false,
    walkPhase: rand(0, 6),
    // Shoppers have a favourite aisle; buying from it makes them happier.
    pref: pick(CATEGORIES),
    // Seconds they will wait in the checkout queue before leaving angry.
    patience: rand(22, 40),
    prefFound: false,
    // A fixed target outside the entrance, chosen once. Re-rolling this every
    // frame made leaving shoppers jitter and never actually despawn.
    exitTarget: { x: rand(-1.6, 1.6), z: 16.5 }
  });
}

function moveToward(c, tx, tz, speed, dt) {
  const g = c.group;
  const dx = tx - g.position.x,
    dz = tz - g.position.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.15) {
    c.moving = false;
    return true;
  }
  const step = Math.min(d, speed * dt);
  g.position.x += (dx / d) * step;
  g.position.z += (dz / d) * step;
  g.rotation.y = Math.atan2(dx, dz);
  c.moving = true;
  return false;
}

export const basketTotal = (game, c) =>
  rounded(c.basket.reduce((t, pid) => t + currentSellPrice(game, pid), 0));

export function clearCustomers(game) {
  for (const c of game.runtime.customers) {
    game.scene.remove(c.group);
    disposeGroup(c.group);
  }
  game.runtime.customers = [];
}

export function reindexQueue(game) {
  let n = 0;
  for (const c of game.runtime.customers) {
    if (c.state === 'queue' || c.state === 'wait') c.queueIndex = n++;
  }
}

export function waitingCustomer(game) {
  const w = game.runtime.customers.filter(
    (c) => (c.state === 'wait' || c.state === 'queue') && c.queueIndex === 0
  );
  return w.length ? w[0] : null;
}

export function doAutoCheckout(game, c) {
  const total = basketTotal(game, c);
  game.state.cash = rounded(game.state.cash + total);
  game.state.lifetimeRevenue += total;
  game.runtime.stats.revenue += total;
  game.runtime.stats.happy++;
  onHappyCustomer(game);
  showEmoji(c, '😊', 2);
  c.state = 'happy';
  game.audio.play('success');
  game.ui.updateHUD();
  game.save();
}

export function updateCustomers(game, dt) {
  const { runtime, state } = game;
  // Keep queue ordering consistent with array (arrival) order before any
  // customer reads its queueIndex this frame.
  reindexQueue(game);
  for (let i = runtime.customers.length - 1; i >= 0; i--) {
    const c = runtime.customers[i];
    c.moving = false;
    if (c.emojiTimer > 0) {
      c.emojiTimer -= dt;
      if (c.emojiTimer <= 0) c.emoji.visible = false;
    }

    if (c.state === 'enter') {
      if (moveToward(c, pick([-4, -2, 0, 2, 4]), 7, 1.9, dt)) {
        c.state = 'browse';
        c.timer = 0;
      }
    } else if (c.state === 'browse') {
      c.timer -= dt;
      if (c.timer <= 0) {
        const available = runtime.shelves.filter((s) => s.stock > 0);
        if (available.length === 0) {
          showEmoji(c, '❓', 2.5);
          runtime.stats.angry++;
          onAngryCustomer(game);
          c.state = 'angry';
          game.audio.play('error');
        } else if (c.visits >= 3) {
          c.state = 'queue';
          c.timer = 0;
          if (basketTotal(game, c) > 15) showEmoji(c, '😠', 3);
        } else {
          // Prefer the customer's favourite aisle when it is in stock.
          const prefAvail = available.filter((s) => PRODUCTS[s.productId].category === c.pref);
          const sh = pick(prefAvail.length ? prefAvail : available);
          const [sx, sz] = game.spot(sh.spot);
          c.browseTarget = [sx, sz + 1.3, sh];
          c.state = 'toShelf';
        }
      }
    } else if (c.state === 'toShelf') {
      const t = c.browseTarget;
      if (moveToward(c, t[0], t[1], 1.9, dt)) {
        const sh = runtime.shelves.find((s) => s === t[2]);
        if (sh && sh.stock > 0) {
          sh.stock--;
          refreshShelfVisual(sh.spot, sh.group, sh, game);
          game.syncShelfData();
          c.basket.push(sh.productId);
          if (PRODUCTS[sh.productId].category === c.pref) c.prefFound = true;
          game.audio.play('scan');
          c.visits++;
        }
        c.state = 'browse';
        c.timer = rand(0.8, 1.6);
      }
    } else if (c.state === 'queue') {
      if (c.queueIndex < 0)
        c.queueIndex = runtime.customers.filter((x) => x.state === 'queue' && x !== c).length;
      if (moveToward(c, 7, 6.2 - c.queueIndex * 1.1, 1.8, dt)) {
        c.state = 'wait';
        c.timer = 0;
      }
    } else if (c.state === 'wait') {
      // Run out of patience while queueing -> leave unhappy.
      c.patience -= dt;
      if (c.patience <= 0) {
        showEmoji(c, '😡', 2.5);
        runtime.stats.angry++;
        onAngryCustomer(game);
        game.audio.play('error');
        c.state = 'angry';
        reindexQueue(game);
        continue;
      }
      if (state.staff.cashier && !runtime.checkoutCustomer && c.queueIndex === 0) {
        c.timer += dt;
        if (c.timer > 1.4) doAutoCheckout(game, c);
      }
    } else if (c.state === 'happy' || c.state === 'angry') {
      const exit = c.exitTarget || { x: 0, z: 16.5 };
      if (moveToward(c, exit.x, exit.z, 2.6, dt)) {
        game.scene.remove(c.group);
        disposeGroup(c.group);
        runtime.customers.splice(i, 1);
        reindexQueue(game);
      }
    }
    animateCustomer(c, dt);
  }
}
