import * as THREE from 'three';
import { PRODUCTS, SHELF_SPOTS } from '../data/products.js';
import { labelTexture } from '../utils/textures.js';

export function makeProductMesh(pid) {
  const p = PRODUCTS[pid];
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.6 });
  let m;
  switch (p.shape) {
    case 'carton': m = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.44, 0.24), mat); break;
    case 'loaf':   m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.24), mat); break;
    case 'sphere': m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), mat); break;
    case 'bottle': m = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.42, 10), mat); break;
    case 'can':    m = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.34, 10), mat); break;
    case 'wedge':  m = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.3), mat); break;
    case 'bag':    m = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.4, 0.12), mat); break;
    default:       m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.25), mat);
  }
  m.castShadow = true;
  g.add(m);
  if (p.shape === 'bottle' || p.shape === 'can') {
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(p.shape === 'can' ? 0.12 : 0.06, p.shape === 'can' ? 0.12 : 0.06, 0.04, 8),
      new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.5 })
    );
    cap.position.y = p.shape === 'can' ? 0.19 : 0.23;
    g.add(cap);
  }
  return g;
}

export const shelfPrompt = sh => `${PRODUCTS[sh.productId].name} shelf — ${sh.stock}/${sh.capacity}`;

export function refreshShelfVisual(spot, group, shd, game) {
  const found = game.runtime.shelves.find(s => s.spot === spot);
  const sh = shd || found;
  const g = group || (found && found.group);
  if (!g || !sh) return;
  const pc = g.userData.products;
  while (pc.children.length) {
    const c = pc.children.pop();
    pc.remove(c);
  }
  const n = Math.min(sh.stock, sh.capacity);
  let idx = 0;
  for (let row = 0; row < 3 && idx < n; row++) {
    for (let col = 0; col < 4 && idx < n; col++, idx++) {
      const pm = makeProductMesh(sh.productId);
      pm.position.set(-0.72 + col * 0.48, 0.42 + row * 0.7, 0);
      pc.add(pm);
    }
  }
}

export function createShelfMesh(shd, game) {
  const [x, z] = SHELF_SPOTS[shd.spot];
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const frameMat = new THREE.MeshStandardMaterial({
    color: shd.fridge ? 0x9fb7c4 : 0x8a6b4a,
    roughness: 0.7,
    metalness: shd.fridge ? 0.3 : 0
  });
  const sideGeo = new THREE.BoxGeometry(0.12, 2.4, 0.9);
  const s1 = new THREE.Mesh(sideGeo, frameMat);
  const s2 = new THREE.Mesh(sideGeo, frameMat);
  s1.position.set(-1.05, 1.2, 0); s2.position.set(1.05, 1.2, 0);
  s1.castShadow = s2.castShadow = true;
  g.add(s1, s2);
  for (const y of [0.25, 0.95, 1.65, 2.3]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 0.9), frameMat);
    b.position.set(0, y, 0); b.castShadow = b.receiveShadow = true; g.add(b);
  }
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.4, 0.08), frameMat);
  back.position.set(0, 1.2, -0.45); g.add(back);
  if (shd.fridge) {
    const gl = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 1.55, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xbfe6f5, transparent: true, opacity: 0.18 })
    );
    gl.position.set(0, 1.3, 0.48); g.add(gl);
  }
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 0.45),
    new THREE.MeshBasicMaterial({ map: labelTexture(PRODUCTS[shd.productId].name, PRODUCTS[shd.productId].color) })
  );
  label.position.set(0, 2.62, 0.2);
  g.add(label);
  g.userData.products = new THREE.Group();
  g.add(g.userData.products);
  game.scene.add(g);
  game.world.tagInteract(g, 'shelf', shelfPrompt(shd));
  refreshShelfVisual(shd.spot, g, shd, game);
  return g;
}
