import * as THREE from 'three';
import { BUILD_CATALOG } from '../data/build.js';

const boxMesh = (w, h, d, color, opts = {}) =>
  new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...opts })
  );

function addShadow(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
}

export function createFixtureMesh(fixture) {
  const item = BUILD_CATALOG[fixture.type];
  const g = new THREE.Group();
  g.position.set(fixture.x, 0, fixture.z);
  g.rotation.y = fixture.rot || 0;

  if (fixture.type === 'counter') {
    const base = boxMesh(2.6, 1, 1.0, 0x356b45);
    base.position.y = 0.5;
    addShadow(base);
    g.add(base);
    const top = boxMesh(2.8, 0.12, 1.2, 0x224d31);
    top.position.y = 1.06;
    addShadow(top);
    g.add(top);
  } else if (fixture.type === 'plant') {
    const pot = boxMesh(0.6, 0.45, 0.6, 0xa9613c);
    pot.position.y = 0.22;
    addShadow(pot);
    g.add(pot);
    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x3f8a4a, roughness: 0.85 })
    );
    leaf.position.set(0, 0.65, 0);
    addShadow(leaf);
    g.add(leaf);
  } else if (fixture.type === 'bench') {
    const seat = boxMesh(1.9, 0.12, 0.65, 0x7a5636);
    seat.position.y = 0.55;
    addShadow(seat);
    g.add(seat);
    const back = boxMesh(1.9, 0.55, 0.1, 0x7a5636);
    back.position.set(0, 0.85, -0.27);
    addShadow(back);
    g.add(back);
    const leg1 = boxMesh(0.12, 0.55, 0.55, 0x4b4b4b);
    leg1.position.set(-0.8, 0.28, 0);
    addShadow(leg1);
    g.add(leg1);
    const leg2 = leg1.clone();
    leg2.position.x = 0.8;
    g.add(leg2);
  } else if (fixture.type === 'sign') {
    const pole = boxMesh(0.12, 2.0, 0.12, 0x4b4b4b);
    pole.position.y = 1.0;
    addShadow(pole);
    g.add(pole);
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 0.6),
      new THREE.MeshBasicMaterial({ color: 0x1d5130 })
    );
    board.position.set(0, 2.2, 0.08);
    g.add(board);
  } else if (fixture.type === 'storage') {
    // Floor marker (visual only)
    const marker = new THREE.Mesh(
      new THREE.PlaneGeometry(item.width, item.depth),
      new THREE.MeshBasicMaterial({ color: 0x2b7a3d, transparent: true, opacity: 0.35 })
    );
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(0, 0.03, 0);
    marker.receiveShadow = true;
    g.add(marker);
    const border = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(item.width, item.depth)),
      new THREE.LineBasicMaterial({ color: 0x9dffb0 })
    );
    border.rotation.x = -Math.PI / 2;
    border.position.set(0, 0.04, 0);
    g.add(border);
  } else {
    // fallback box
    const w = item?.width || 1;
    const d = item?.depth || 1;
    const m = boxMesh(w, 0.6, d, 0x888888);
    m.position.y = 0.3;
    addShadow(m);
    g.add(m);
  }

  return g;
}
