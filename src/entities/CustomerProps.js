import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Basket / cart props. Each kind is merged once per material and shared by
// every shopper, so a prop is just two or three meshes and no upload per spawn.

const materials = new Map();
const geometries = new Map();

function geo(key, make) {
  if (!geometries.has(key)) geometries.set(key, make());
  return geometries.get(key);
}

function mat(color, { roughness = 0.65, metalness = 0.05 } = {}) {
  const key = `${color}-${roughness}-${metalness}`;
  if (!materials.has(key)) {
    materials.set(
      key,
      new THREE.MeshStandardMaterial({ color, roughness, metalness })
    );
  }
  return materials.get(key);
}

function boxGeo(w, h, d) {
  return geo(`box:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d));
}

function at(geometry, x = 0, y = 0, z = 0) {
  const clone = geometry.clone();
  clone.translate(x, y, z);
  return clone;
}

function mergeParts(parts) {
  const merged = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  return merged;
}

function mesh(geometry, material) {
  const out = new THREE.Mesh(geometry, material);
  out.castShadow = true;
  out.receiveShadow = true;
  return out;
}

const BASKET_COLORS = [0xd9712d, 0xb23a3a, 0x2f7a54, 0x3c5f9e];
const basketPick = () => BASKET_COLORS[Math.floor(Math.random() * BASKET_COLORS.length)];

const BASKET = { w: 0.36, d: 0.25, h: 0.22 };
const CART = { bw: 0.56, bd: 0.8, bh: 0.44, bz: 0.72, by: 0.64 };

/** One merged wire-basket geometry: vertical bars plus top/bottom rails. */
function wireBasket(w, h, d, bar = 0.013) {
  const parts = [];
  const hw = w / 2;
  const hd = d / 2;
  const add = (bw, bh, bd, x, y, z) => {
    const g = new THREE.BoxGeometry(bw, bh, bd);
    g.translate(x, y, z);
    parts.push(g);
  };
  for (const sx of [-1, -0.5, 0, 0.5, 1]) {
    for (const sz of [-1, 1]) add(bar, h, bar, sx * hw, 0, sz * hd);
  }
  for (const sz of [-1, -0.5, 0, 0.5, 1]) {
    for (const sx of [-1, 1]) add(bar, h, bar, sx * hw, 0, sz * hd);
  }
  for (const y of [-h / 2, 0, h / 2]) {
    add(w, bar, bar, 0, y, hd);
    add(w, bar, bar, 0, y, -hd);
    add(bar, bar, d, hw, y, 0);
    add(bar, bar, d, -hw, y, 0);
  }
  return mergeParts(parts);
}

function basketParts() {
  return geo('basket:parts', () => {
    const { w, d, h } = BASKET;
    const plastic = [at(boxGeo(w, 0.02, d), 0, 0.01, 0)];
    for (const side of [-1, 1]) {
      plastic.push(at(boxGeo(0.018, h, d), (side * w) / 2, h / 2, 0));
      plastic.push(at(boxGeo(w, h, 0.018), 0, h / 2, (side * d) / 2));
    }
    const handle = new THREE.TorusGeometry(w * 0.42, 0.009, 6, 18, Math.PI);
    handle.rotateY(Math.PI / 2);
    handle.translate(0, h - 0.01, 0);
    return { plastic: mergeParts(plastic), handle };
  });
}

function cartParts() {
  return geo('cart:parts', () => {
    const { bw, bd, bh, bz, by } = CART;
    const top = by + bh / 2;
    const metal = [
      at(geo('cart:wire', () => wireBasket(bw, bh, bd)), 0, by, bz),
      at(boxGeo(bw * 0.9, 0.02, bd * 0.85), 0, 0.19, bz),
      at(boxGeo(0.025, 0.24, 0.025), 0.2, 0.93, 0.32),
      at(boxGeo(0.025, 0.24, 0.025), -0.2, 0.93, 0.32)
    ];
    const accent = [
      at(boxGeo(bw + 0.02, 0.03, 0.03), 0, top, bz + bd / 2),
      at(boxGeo(bw + 0.02, 0.03, 0.03), 0, top, bz - bd / 2),
      at(boxGeo(0.03, 0.03, bd + 0.02), bw / 2, top, bz),
      at(boxGeo(0.03, 0.03, bd + 0.02), -bw / 2, top, bz),
      at(boxGeo(0.46, 0.035, 0.035), 0, 1.04, 0.3)
    ];
    const rubber = [];
    for (const sx of [-1, 1]) {
      for (const sz of [0.46, 1.0]) {
        const wheel = geo('cart:wheel', () => new THREE.CylinderGeometry(0.07, 0.07, 0.04, 12)).clone();
        wheel.rotateZ(Math.PI / 2);
        wheel.translate((sx * bw) / 2 - sx * 0.02, 0.07, sz);
        rubber.push(wheel);
      }
    }
    return {
      metal: mergeParts(metal),
      accent: mergeParts(accent),
      rubber: mergeParts(rubber)
    };
  });
}

/** Hand basket: open box with a folding handle (two shared meshes). */
export function makeBasketProp(color = basketPick()) {
  const group = new THREE.Group();
  group.name = 'customer_basket';
  const parts = basketParts();
  group.add(mesh(parts.plastic, mat(color, { roughness: 0.55 })));
  group.add(mesh(parts.handle, mat(0x3b3f45, { roughness: 0.4, metalness: 0.6 })));
  group.userData.kind = 'basket';
  return group;
}

/** Supermarket cart with a wire basket, four wheels and a push handle. */
export function makeCartProp(color = 0xb23a3a) {
  const group = new THREE.Group();
  group.name = 'customer_cart';
  const parts = cartParts();
  group.add(mesh(parts.metal, mat(0x9aa4ad, { roughness: 0.35, metalness: 0.65 })));
  group.add(mesh(parts.accent, mat(color, { roughness: 0.5 })));
  group.add(mesh(parts.rubber, mat(0x24262a, { roughness: 0.9 })));
  group.userData.kind = 'cart';
  return group;
}

/** Build and position the prop that matches a character's carry style. */
export function makeCarryProp(kind, height) {
  if (kind === 'basket') {
    const basket = makeBasketProp();
    basket.position.set(0, height * 0.5, 0.36);
    return basket;
  }
  if (kind === 'cart') {
    const cart = makeCartProp();
    cart.position.set(0, 0, 0.08);
    return cart;
  }
  return null;
}

/** Props share cached geometry and materials, so only detach them. */
export function releaseCarryProp(prop) {
  if (!prop) return;
  prop.removeFromParent();
}
