import * as THREE from 'three';
import { floorTexture, outsideTexture, signTexture, makeCanvas } from '../utils/textures.js';

const boxMesh = (w, h, d, color, opts = {}) => {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...opts })
  );
  m.castShadow = true; m.receiveShadow = true;
  return m;
};

export default class StoreWorld {
  constructor(game) {
    this.game = game;
    this.interactables = [];
    this.colliders = [];
  }

  tagInteract(obj, type, prompt) {
    obj.userData.interact = { type, prompt };
    this.interactables.push(obj);
  }

  build() {
    const { scene, state } = this.game;

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshStandardMaterial({ map: floorTexture() }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    const yard = new THREE.Mesh(new THREE.PlaneGeometry(50, 26), new THREE.MeshStandardMaterial({ map: outsideTexture() }));
    yard.rotation.x = -Math.PI / 2; yard.position.set(0, -0.02, 20); yard.receiveShadow = true; scene.add(yard);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0xe8efe6, roughness: 0.9 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x86c7de, transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0.1 });
    const wall = (x, z, w, d, h, mat = wallMat) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, h / 2, z); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
    };
    wall(0, -12, 24, 0.5, 5);
    wall(-12, 0, 0.5, 24, 5);
    wall(12, 0, 0.5, 24, 5);
    wall(-7.25, 12, 9.5, 0.5, 5);
    wall(7.25, 12, 9.5, 0.5, 5);
    wall(0, 12, 5, 0.5, 1.2);
    const g1 = new THREE.Mesh(new THREE.BoxGeometry(9.2, 2.2, 0.1), glassMat);
    g1.position.set(-7.25, 3, 12); scene.add(g1);
    const g2 = g1.clone(); g2.position.x = 7.25; scene.add(g2);

    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshBasicMaterial({ color: 0xe9eee8, side: THREE.DoubleSide }));
    ceil.rotation.x = Math.PI / 2; ceil.position.y = 5; scene.add(ceil);

    // --- Decor: wall trim, welcome mat, plants and aisle signs ---
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x9dbb9d, roughness: 0.9 });
    const addTrim = (x, z, w, d) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 1.0, d), trimMat);
      m.position.set(x, 0.5, z); m.receiveShadow = true; scene.add(m);
    };
    addTrim(0, -11.7, 23.6, 0.06);
    addTrim(-11.7, 0, 0.06, 23.6);
    addTrim(11.7, 0, 0.06, 23.6);

    const mat = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 1.6),
      new THREE.MeshStandardMaterial({
        map: makeCanvas((x, w, h) => {
          x.fillStyle = '#1d5130'; x.fillRect(0, 0, w, h);
          x.strokeStyle = '#8fd6a2'; x.lineWidth = 8; x.strokeRect(12, 12, w - 24, h - 24);
          x.fillStyle = '#eafbe9'; x.font = 'bold 52px Arial'; x.textAlign = 'center';
          x.fillText('WELCOME', w / 2, h / 2 + 18);
        }, 512, 256),
        roughness: 1
      })
    );
    mat.rotation.x = -Math.PI / 2; mat.position.set(0, 0.02, 10.8); scene.add(mat);

    const potMat = new THREE.MeshStandardMaterial({ color: 0xa9613c, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f8a4a, roughness: 0.85 });
    for (const [px, pz] of [[-10, -9], [10, -9], [-10, 3], [10, 3]]) {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.5, 10), potMat);
      pot.position.set(px, 0.25, pz); pot.castShadow = true; scene.add(pot);
      for (const [ox, oy, oz, s] of [[0, 0.75, 0, 0.42], [-0.2, 0.62, 0.1, 0.3], [0.2, 0.66, -0.1, 0.32]]) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), leafMat);
        leaf.position.set(px + ox, oy, pz + oz); leaf.castShadow = true; scene.add(leaf);
      }
    }

    const aisleSign = (text, x) => {
      const s = new THREE.Mesh(
        new THREE.PlaneGeometry(2.2, 0.55),
        new THREE.MeshBasicMaterial({
          map: makeCanvas((cx, w, h) => {
            cx.fillStyle = '#143b25'; cx.fillRect(0, 0, w, h);
            cx.strokeStyle = '#ffd76b'; cx.lineWidth = 6; cx.strokeRect(8, 8, w - 16, h - 16);
            cx.fillStyle = '#fff5d6'; cx.font = 'bold 44px Arial'; cx.textAlign = 'center';
            cx.fillText(text, w / 2, h / 2 + 16);
          }, 512, 128),
          side: THREE.DoubleSide
        })
      );
      s.position.set(x, 3.6, -2);
      scene.add(s);
    };
    aisleSign('AISLE 1', -5);
    aisleSign('AISLE 2', 3);

    // Delivery pallet outside
    const pallet = new THREE.Mesh(
      new THREE.BoxGeometry(6, 0.12, 2.4),
      new THREE.MeshStandardMaterial({ color: 0x8b6a42, roughness: 0.95 })
    );
    pallet.position.set(0, 0.04, 16.6); pallet.receiveShadow = true; scene.add(pallet);

    // Sign above the entrance
    this.sign = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.75), new THREE.MeshBasicMaterial({ map: signTexture(state.storeName) }));
    this.sign.position.set(0, 3.5, 12.35); scene.add(this.sign);

    // Register
    const reg = new THREE.Group();
    const counter = boxMesh(2.6, 1, 1.1, 0x356b45); counter.position.y = 0.5; reg.add(counter);
    const top = boxMesh(2.8, 0.12, 1.2, 0x224d31); top.position.y = 1.06; reg.add(top);
    const screen = boxMesh(0.7, 0.5, 0.5, 0x222a26); screen.position.set(-0.6, 1.4, 0); reg.add(screen);
    const scan = boxMesh(0.5, 0.08, 0.35, 0xcc2222, { emissive: 0x661111 }); scan.position.set(0.5, 1.16, 0); reg.add(scan);
    reg.position.set(7, 0, 8); scene.add(reg);
    this.tagInteract(reg, 'register', 'Register — check out customer');
    this.register = reg;
    this.cashierSpot = new THREE.Vector3(7, 0, 6.2);

    // Store terminal
    const term = new THREE.Group();
    const base = boxMesh(1.2, 1.1, 0.8, 0x3a4450); base.position.y = 0.55; term.add(base);
    const sc = boxMesh(1.05, 0.7, 0.08, 0x0c2a1a, { emissive: 0x0a3a20 });
    sc.position.set(0, 1.35, -0.32); sc.rotation.x = -0.25; term.add(sc);
    term.position.set(-7, 0, 8); term.rotation.y = Math.PI; scene.add(term);
    this.tagInteract(term, 'terminal', 'Store Terminal — manage your store');
    this.terminal = term;

    // Delivery marker + beacon
    const zone = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 5),
      new THREE.MeshBasicMaterial({ color: 0x2b7a3d, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    zone.rotation.x = -Math.PI / 2; zone.position.set(0, 0.01, 16); scene.add(zone);
    const beacon = new THREE.Group();
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 4), new THREE.MeshBasicMaterial({ color: 0x7dff9a, transparent: true, opacity: 0.85 }));
    cone.rotation.x = Math.PI; beacon.add(cone);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.08, 8, 24), new THREE.MeshBasicMaterial({ color: 0x9dffb0 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = -0.9; beacon.add(ring);
    beacon.position.set(0, 3.4, 16); beacon.visible = false; scene.add(beacon);
    this.beacon = beacon;
    this.beaconLight = new THREE.PointLight(0x7dff9a, 0, 12);
    this.beaconLight.position.set(0, 3, 16); scene.add(this.beaconLight);

    // Dumpster
    const dump = new THREE.Group();
    const bin = boxMesh(2.2, 1.2, 1.4, 0x2f6b40); bin.position.y = 0.6; dump.add(bin);
    const lid = boxMesh(2.4, 0.12, 1.5, 0x224d31, { metalness: 0.3 }); lid.position.y = 1.28; dump.add(lid);
    dump.position.set(-10, 0, 16); scene.add(dump);
    this.tagInteract(dump, 'dumpster', 'Dumpster — dispose of trash boxes');
    this.dumpster = dump;

    this.rebuildColliders();
  }

  rebuildColliders() {
    const c = [
      { minX: -12.5, maxX: 12.5, minZ: -12.4, maxZ: -11.6 },
      { minX: -12.4, maxX: -11.6, minZ: -12, maxZ: 12.4 },
      { minX: 11.6, maxX: 12.4, minZ: -12, maxZ: 12.4 },
      { minX: -12.4, maxX: -2.5, minZ: 11.6, maxZ: 12.4 },
      { minX: 2.5, maxX: 12.4, minZ: 11.6, maxZ: 12.4 },
      { minX: 5.5, maxX: 8.5, minZ: 7.2, maxZ: 8.8 },
      { minX: -7.7, maxX: -6.3, minZ: 7.4, maxZ: 8.6 },
      { minX: -11.3, maxX: -8.7, minZ: 15.2, maxZ: 16.8 }
    ];
    for (const sh of this.game.runtime.shelves) {
      const [x, z] = this.game.spot(sh.spot);
      c.push({ minX: x - 1.1, maxX: x + 1.1, minZ: z - 0.5, maxZ: z + 0.5 });
    }
    this.colliders = c;
  }

  collides(x, z) {
    const r = 0.38;
    return this.colliders.some(c => x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ);
  }

  setStoreName(name) {
    this.sign.material.map.dispose();
    this.sign.material.map = signTexture(name);
    this.sign.material.needsUpdate = true;
  }

  updateBeacon(time) {
    if (!this.beacon.visible) return;
    this.beacon.position.y = 3.4 + Math.sin(time * 2) * 0.3;
    this.beacon.rotation.y = time;
    this.beaconLight.intensity = 0.9 + Math.sin(time * 4) * 0.4;
  }
}
