import * as THREE from 'three';
import { pick, rand } from '../utils/math.js';

const custMat = color => new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0.02 });

// Fully procedural shopper model: face, hair, accessories, articulated arms/legs, optional basket.
export function makeCustomerModel() {
  const skin = pick([0xf0d6b5, 0xe8c39e, 0xd9a578, 0xc98d63, 0x8d5b3c]);
  const shirt = pick([0x3f6fb5, 0xb5553f, 0x4f9e6a, 0x8b5fb0, 0xc29a3a, 0x397d8a, 0xd45f7a, 0x2f4f7a]);
  const pants = pick([0x2d3542, 0x3c4a5a, 0x54443a, 0x5a5f66, 0x293b33]);
  const hairColor = pick([0x2a211b, 0x4a3323, 0x7a5230, 0xb08a4a, 0x9a9a9a, 0x3b2a2a]);
  const shoeColor = pick([0x1d2329, 0x3a2a22, 0xe8e8e2]);

  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);
  const part = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    rig.add(m);
    return m;
  };

  // Torso / neck / hips
  part(new THREE.CylinderGeometry(0.27, 0.33, 0.86, 12), custMat(shirt), 0, 1.12, 0);
  part(new THREE.CylinderGeometry(0.31, 0.29, 0.26, 12), custMat(pants), 0, 0.72, 0);
  part(new THREE.CylinderGeometry(0.09, 0.09, 0.13, 10), custMat(skin), 0, 1.57, 0);
  const collar = part(new THREE.TorusGeometry(0.17, 0.032, 6, 14), custMat(0xf2f2ec), 0, 1.53, 0);
  collar.rotation.x = Math.PI / 2;

  // Head, hair, optional cap
  const head = part(new THREE.SphereGeometry(0.24, 14, 12), custMat(skin), 0, 1.79, 0);
  head.scale.set(1, 1.08, 0.94);
  // Hair cap covers the crown and the back of the head, with a short nape.
  const hairMat = custMat(hairColor);
  const hair = part(new THREE.SphereGeometry(0.248, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), hairMat, 0, 1.81, -0.015);
  hair.scale.set(1.03, 1.04, 1.02);
  part(new THREE.SphereGeometry(0.17, 12, 8), hairMat, 0, 1.70, -0.17).scale.set(1, 0.6, 0.5);
  // Ears
  part(new THREE.SphereGeometry(0.052, 8, 8), custMat(skin), -0.235, 1.78, 0);
  part(new THREE.SphereGeometry(0.052, 8, 8), custMat(skin), 0.235, 1.78, 0);
  if (Math.random() < 0.25) {
    part(new THREE.CylinderGeometry(0.25, 0.25, 0.13, 14), custMat(pick([0x2b6b45, 0x9c332f, 0x243b63])), 0, 1.98, 0);
    part(new THREE.BoxGeometry(0.3, 0.025, 0.22), custMat(0x1f2a22), 0, 1.94, 0.22);
  }

  // Face (local +Z is the direction the customer faces)
  part(new THREE.SphereGeometry(0.043, 8, 8), custMat(0xffffff), -0.09, 1.81, 0.215);
  part(new THREE.SphereGeometry(0.043, 8, 8), custMat(0xffffff), 0.09, 1.81, 0.215);
  part(new THREE.SphereGeometry(0.021, 8, 8), custMat(0x1b1b22), -0.09, 1.81, 0.25);
  part(new THREE.SphereGeometry(0.021, 8, 8), custMat(0x1b1b22), 0.09, 1.81, 0.25);
  part(new THREE.BoxGeometry(0.09, 0.018, 0.02), custMat(hairColor), -0.09, 1.88, 0.226).rotation.z = 0.08;
  part(new THREE.BoxGeometry(0.09, 0.018, 0.02), custMat(hairColor), 0.09, 1.88, 0.226).rotation.z = -0.08;
  part(new THREE.SphereGeometry(0.04, 8, 8), custMat(skin), 0, 1.74, 0.245);
  part(new THREE.SphereGeometry(0.055, 10, 8), custMat(0x8c4a45), 0, 1.655, 0.222).scale.set(1, 0.32, 0.3);
  if (Math.random() < 0.22) {
    part(new THREE.TorusGeometry(0.062, 0.012, 6, 14), custMat(0x2b2b2b), -0.09, 1.81, 0.25);
    part(new THREE.TorusGeometry(0.062, 0.012, 6, 14), custMat(0x2b2b2b), 0.09, 1.81, 0.25);
    part(new THREE.BoxGeometry(0.04, 0.012, 0.012), custMat(0x2b2b2b), 0, 1.81, 0.25);
  }

  // Arms with shoulder pivots
  const makeArm = side => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.33, 1.46, 0);
    rig.add(pivot);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.07, 0.34, 8), custMat(shirt));
    sleeve.position.y = -0.17; pivot.add(sleeve);
    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.058, 0.32, 8), custMat(skin));
    fore.position.y = -0.48; pivot.add(fore);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), custMat(skin));
    hand.position.y = -0.66; pivot.add(hand);
    return pivot;
  };
  const armL = makeArm(-1), armR = makeArm(1);

  if (Math.random() < 0.45) {
    const basket = new THREE.Group();
    basket.position.set(0, -0.72, 0.08);
    basket.scale.setScalar(0.85);
    armR.add(basket);
    const bm = custMat(pick([0xd98b2b, 0xc4453a, 0x3f8f6a]));
    basket.add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.025, 0.32), bm));
    for (const z of [-0.16, 0.16]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.2, 0.02), bm);
      w.position.set(0, 0.1, z); basket.add(w);
    }
    for (const x of [-0.21, 0.21]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 0.32), bm);
      w.position.set(x, 0.1, 0); basket.add(w);
    }
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.018, 6, 14, Math.PI), custMat(0x3a3a3a));
    handle.position.y = 0.2; basket.add(handle);
  }

  // Legs with hip pivots and shoes
  const makeLeg = side => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.15, 0.7, 0);
    rig.add(pivot);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.09, 0.62, 8), custMat(pants));
    leg.position.y = -0.31; pivot.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.1, 0.3), custMat(shoeColor));
    shoe.position.set(0, -0.65, 0.07); pivot.add(shoe);
    return pivot;
  };
  const legL = makeLeg(-1), legR = makeLeg(1);

  rig.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { root, rig, armL, armR, legL, legR };
}

export function animateCustomer(c, dt) {
  if (!c.rig) return;
  c.walkPhase = (c.walkPhase || 0) + dt * (c.moving ? 10 : 2);
  const sw = Math.sin(c.walkPhase);
  if (c.state === 'happy') {
    c.armL.rotation.x = -2.2 + sw * 0.18;
    c.armR.rotation.x = -2.2 - sw * 0.18;
    c.legL.rotation.x = 0; c.legR.rotation.x = 0;
    c.rig.rotation.x = -0.04;
  } else if (c.state === 'angry') {
    c.armL.rotation.x = 0.12; c.armR.rotation.x = 0.12;
    c.legL.rotation.x = 0; c.legR.rotation.x = 0;
    c.rig.rotation.x = 0.1;
  } else {
    c.armL.rotation.x = sw * 0.45;
    c.armR.rotation.x = -sw * 0.45;
    c.legL.rotation.x = -sw * 0.5;
    c.legR.rotation.x = sw * 0.5;
    c.rig.rotation.x = 0;
  }
  c.rig.position.y = c.moving ? Math.abs(sw) * 0.035 : Math.sin(c.walkPhase) * 0.006;
  c.rig.rotation.z = Math.sin(c.walkPhase * 0.5) * 0.012;
}
