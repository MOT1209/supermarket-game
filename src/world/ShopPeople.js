import * as THREE from 'three';
import { kitMaterial, kitGeometry } from './ShopKit.js';

// Lightweight low-poly shop staff and shoppers. Geometry and materials are
// cached by colour, so all five shops share the same resources.

const SKIN = [0xf0d6b5, 0xe8c39e, 0xd9a578, 0xc98d63, 0x8d5b3c];
const HAIR = [0x2a211b, 0x4a3323, 0x7a5230, 0xb08a4a, 0x8a8a8a, 0x3b2a2a];
const SHIRTS = [0x3f6fb5, 0xb5553f, 0x4f9e6a, 0x8b5fb0, 0xc29a3a, 0x397d8a, 0xd45f7a];
const PANTS = [0x2d3542, 0x3c4a5a, 0x54443a, 0x5a5f66, 0x293b33];

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const mat = (color) => kitMaterial(`person-${color}`, color, { roughness: 0.86 });
const geo = (key, make) => kitGeometry(key, make);

function part(parent, geometry, material, x, y, z) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

const ROLE_STYLE = {
  baker: { shirt: 0xf2eee2, pants: 0x3b3a36, apron: 0x8a4a2b, hat: 0xf7f5ee },
  barista: { shirt: 0x1f4a36, pants: 0x2a2f33, apron: 0x356b4d, hat: 0x1a2a22 },
  pharmacist: { shirt: 0xf7f7f2, pants: 0x394a55, apron: 0x2f8fa6, hat: null },
  clerk: { shirt: 0x25324d, pants: 0x242a35, apron: 0xc9a86a, hat: null },
  technician: { shirt: 0x1b8c98, pants: 0x242a30, apron: 0x161c22, hat: 0x14343a }
};

export function makeShopPerson({ role = 'customer', staff = false, palette = {} } = {}) {
  const style = ROLE_STYLE[role] || {};
  const skin = palette.skin ?? pick(SKIN);
  const hair = palette.hair ?? pick(HAIR);
  const shirt = palette.shirt ?? style.shirt ?? pick(SHIRTS);
  const pants = palette.pants ?? pick(PANTS);
  const apronColor = palette.apron ?? style.apron ?? 0x3a3a3a;
  const shoe = palette.shoe ?? 0x1d2329;

  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);

  // Torso, hips, neck.
  part(
    rig,
    geo('person-torso', () => new THREE.CylinderGeometry(0.27, 0.32, 0.82, 10)),
    mat(shirt),
    0,
    1.14,
    0
  );
  part(
    rig,
    geo('person-hips', () => new THREE.CylinderGeometry(0.29, 0.26, 0.24, 10)),
    mat(pants),
    0,
    0.75,
    0
  );
  part(
    rig,
    geo('person-neck', () => new THREE.CylinderGeometry(0.085, 0.085, 0.12, 8)),
    mat(skin),
    0,
    1.61,
    0
  );

  // Apron front.
  part(
    rig,
    geo('person-apron', () => new THREE.BoxGeometry(0.42, 0.62, 0.04)),
    mat(apronColor),
    0,
    1.06,
    0.28
  );
  if (staff) {
    part(
      rig,
      geo('person-badge', () => new THREE.BoxGeometry(0.13, 0.08, 0.02)),
      kitMaterial('person-badge', 0xf5c518),
      0.18,
      1.38,
      0.305
    );
  }

  // Head, hair, ears and a simple face.
  const head = part(
    rig,
    geo('person-head', () => new THREE.SphereGeometry(0.225, 14, 12)),
    mat(skin),
    0,
    1.82,
    0
  );
  head.scale.set(1, 1.07, 0.94);
  const hairMesh = part(
    rig,
    geo(
      'person-hair',
      () => new THREE.SphereGeometry(0.238, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6)
    ),
    mat(hair),
    0,
    1.84,
    -0.015
  );
  hairMesh.scale.set(1.02, 1.03, 1.01);
  part(
    rig,
    geo('person-ear', () => new THREE.SphereGeometry(0.05, 8, 8)),
    mat(skin),
    -0.225,
    1.8,
    0
  );
  part(
    rig,
    geo('person-ear', () => new THREE.SphereGeometry(0.05, 8, 8)),
    mat(skin),
    0.225,
    1.8,
    0
  );
  const eyeGeo = geo('person-eye', () => new THREE.SphereGeometry(0.022, 8, 8));
  part(rig, eyeGeo, kitMaterial('person-eye', 0x1b1b22), -0.085, 1.84, 0.205);
  part(rig, eyeGeo, kitMaterial('person-eye', 0x1b1b22), 0.085, 1.84, 0.205);
  part(
    rig,
    geo('person-mouth', () => new THREE.BoxGeometry(0.075, 0.015, 0.015)),
    kitMaterial('person-mouth', 0x8a4a45),
    0,
    1.72,
    0.21
  );

  // Hats / glasses / accessories identify each job.
  if (style.hat) {
    part(
      rig,
      geo('person-hat', () => new THREE.CylinderGeometry(0.22, 0.24, 0.16, 12)),
      mat(style.hat),
      0,
      2.02,
      0
    );
    part(
      rig,
      geo('person-hat-top', () => new THREE.CylinderGeometry(0.235, 0.235, 0.06, 12)),
      mat(style.hat),
      0,
      2.12,
      0
    );
  }
  if (role === 'pharmacist') {
    const glasses = kitMaterial('person-glasses', 0x2b3138, { metalness: 0.4, roughness: 0.4 });
    for (const x of [-0.085, 0.085]) {
      const lens = part(
        rig,
        geo('person-lens', () => new THREE.TorusGeometry(0.055, 0.012, 6, 14)),
        glasses,
        x,
        1.84,
        0.215
      );
      lens.rotation.x = 0;
    }
  }
  if (role === 'technician') {
    part(
      rig,
      geo('person-visor', () => new THREE.BoxGeometry(0.28, 0.055, 0.08)),
      kitMaterial('person-visor', 0x36f0ff, { emissive: 0x0a4d52 }),
      0,
      1.9,
      0.2
    );
  }
  if (!staff) {
    // Shoppers carry a basket or a small bag.
    if (Math.random() < 0.55) {
      const basket = new THREE.Group();
      basket.position.set(0.33, 0.9, 0.08);
      const basketMat = mat(pick([0xd98b2b, 0xc4453a, 0x3f8f6a]));
      part(
        basket,
        geo('person-basket', () => new THREE.BoxGeometry(0.36, 0.22, 0.28)),
        basketMat,
        0,
        0,
        0
      );
      part(
        basket,
        geo('person-basket-handle', () => new THREE.TorusGeometry(0.14, 0.014, 6, 12, Math.PI)),
        mat(0x3a3a3a),
        0,
        0.14,
        0
      );
      rig.add(basket);
    }
  }

  // Arms with shoulder pivots.
  const makeArm = (side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.33, 1.48, 0);
    rig.add(pivot);
    part(
      pivot,
      geo('person-sleeve', () => new THREE.CylinderGeometry(0.075, 0.065, 0.36, 8)),
      mat(shirt),
      0,
      -0.18,
      0
    );
    part(
      pivot,
      geo('person-forearm', () => new THREE.CylinderGeometry(0.055, 0.05, 0.3, 8)),
      mat(skin),
      0,
      -0.5,
      0
    );
    part(
      pivot,
      geo('person-hand', () => new THREE.SphereGeometry(0.068, 8, 8)),
      mat(skin),
      0,
      -0.68,
      0
    );
    return pivot;
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);

  // Legs with hip pivots and shoes.
  const makeLeg = (side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.14, 0.72, 0);
    rig.add(pivot);
    part(
      pivot,
      geo('person-leg', () => new THREE.CylinderGeometry(0.098, 0.085, 0.62, 8)),
      mat(pants),
      0,
      -0.31,
      0
    );
    part(
      pivot,
      geo('person-shoe', () => new THREE.BoxGeometry(0.18, 0.09, 0.28)),
      mat(shoe),
      0,
      -0.65,
      0.065
    );
    return pivot;
  };
  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  return {
    root,
    rig,
    head,
    armL,
    armR,
    legL,
    legR,
    role,
    staff,
    phase: Math.random() * 6,
    seed: Math.random() * 10,
    gesture: 0
  };
}

export function staffPalette(role) {
  const style = ROLE_STYLE[role] || {};
  return {
    shirt: style.shirt,
    pants: style.pants,
    apron: style.apron,
    skin: pick(SKIN),
    hair: pick(HAIR)
  };
}

export function animateShopPerson(person, dt, time, moving = false) {
  if (!person) return;
  person.phase += dt * (moving ? 9 : 1.6);
  const sw = Math.sin(person.phase);

  if (moving) {
    person.armL.rotation.x = sw * 0.42;
    person.armR.rotation.x = -sw * 0.42;
    person.legL.rotation.x = -sw * 0.48;
    person.legR.rotation.x = sw * 0.48;
    person.rig.position.y = Math.abs(sw) * 0.03;
    person.rig.rotation.z = Math.sin(person.phase * 0.5) * 0.012;
    if (person.head) person.head.rotation.y *= 0.9;
    person.gesture *= 0.9;
  } else {
    person.legL.rotation.x *= 0.8;
    person.legR.rotation.x *= 0.8;
    person.armL.rotation.x = Math.sin(time * 1.7 + person.seed) * 0.04;
    person.armR.rotation.x = -Math.sin(time * 1.7 + person.seed) * 0.04;
    person.rig.position.y = Math.sin(time * 1.8 + person.seed) * 0.006;
    person.rig.rotation.z = 0;
    if (person.head) {
      person.head.rotation.y = Math.sin(time * 0.55 + person.seed) * 0.28;
    }
    // Staff occasionally reach for a tool or wipe the counter.
    if (person.staff && Math.sin(time * 0.75 + person.seed) > 0.965) {
      person.gesture = 1;
    }
    if (person.gesture > 0.01) {
      person.gesture *= 0.96;
      person.armR.rotation.x = -1.15 * person.gesture;
    }
  }
}
