import * as THREE from 'three';
import { BUSINESS_LIST } from '../data/businesses.js';
import { SHOP_ACTIVITIES } from '../data/shopActivities.js';
import { cloneModel } from '../utils/AssetLoader.js';
import { disposeObject3D } from '../utils/dispose.js';
import {
  SHOP_MAT,
  awningMaterial,
  bladeSignTexture,
  box,
  cylinder,
  facadeMaterial,
  floorMaterial,
  kitBasic,
  kitGeometry,
  kitMaterial,
  menuBoardTexture,
  plane,
  productShelfTexture,
  screenTexture,
  shopSignTexture,
  sphere,
  welcomeMatTexture
} from './ShopKit.js';
import { animateShopPerson, makeShopPerson, staffPalette } from './ShopPeople.js';

const WALL_H = 4.6;
const DOOR_H = 2.9;
const HALF_W = 6.2;
const FRONT = -0.2;
const BACK = 11.8;
const DOOR_HALF = 1.4;

const ease = (t) => t * t * (3 - 2 * t);

const SHOP_GLB = {
  counter: 'shops/shop_counter.glb',
  shelf: 'shops/shop_shelf.glb',
  oven: 'shops/bakery_oven.glb',
  espressoBar: 'shops/cafe_bar.glb',
  pharmacyCounter: 'shops/pharmacy_counter.glb',
  tailorTable: 'shops/tailor_table.glb',
  workbench: 'shops/electronics_bench.glb',
  table: 'shops/cafe_table.glb',
  rack: 'shops/clothing_rack.glb',
  displayCase: 'shops/display_case.glb'
};

function matForPerson(color) {
  return kitMaterial(`person-${color}`, color, { roughness: 0.86 });
}

export default class ShopWorld {
  constructor(game, city) {
    this.game = game;
    this.city = city;
    this.shops = new Map();
    this.time = 0;
  }

  build() {
    for (const business of BUSINESS_LIST) this.buildShop(business);
  }

  buildShop(b) {
    const shop = {
      business: b,
      group: new THREE.Group(),
      fixtures: [],
      markers: [],
      lights: [],
      customers: [],
      door: null
    };
    shop.group.name = `shop_${b.id}`;
    shop.group.position.set(b.entrance.x, 0, b.entrance.z);
    this.city.group.add(shop.group);
    this.shops.set(b.id, shop);

    this.buildShell(b, shop);
    this.buildFacade(b, shop);
    this.buildInterior(b, shop);
    this.buildDoor(b, shop);
    this.buildStaff(b, shop);
    this.buildCustomers(b, shop);
    this.addColliders(b, shop);
  }

  // -------------------------------------------------------------------------
  // Shell
  // -------------------------------------------------------------------------

  buildShell(b, shop) {
    const g = shop.group;
    const frontMat = facadeMaterial(b);
    const bodyMat = kitMaterial(`shop-body-${b.id}`, b.facade, { roughness: 0.88 });
    const wallMat = SHOP_MAT.wall;
    const trimMat = kitMaterial(`shop-trim-${b.id}`, b.trim, { roughness: 0.76 });
    const accentMat = kitMaterial(`shop-accent-${b.id}`, b.accent, { roughness: 0.82 });

    plane(g, 12.4, 12, floorMaterial(b), 0, 0.06, 5.8, { rotX: -Math.PI / 2 });
    plane(g, 12.4, 12, kitMaterial('shop-ceiling', 0xf3f0e7, { roughness: 1 }), 0, 4.56, 5.8, {
      rotX: Math.PI / 2
    });

    // Back and side shell.
    box(g, 12.7, WALL_H, 0.36, bodyMat, 0, WALL_H / 2, BACK + 0.02);
    box(g, 0.36, WALL_H, 12.1, bodyMat, -HALF_W - 0.02, WALL_H / 2, 5.8);
    box(g, 0.36, WALL_H, 12.1, bodyMat, HALF_W + 0.02, WALL_H / 2, 5.8);

    // Front wall with a central door and two large display windows. Each
    // opening is a real hole so the glass reveals the interior.
    const windowInner = 1.6;
    const windowOuter = 5.8;
    const windowWidth = windowOuter - windowInner;
    const windowCenter = (windowInner + windowOuter) / 2;
    box(
      g,
      HALF_W - windowOuter,
      WALL_H,
      0.34,
      frontMat,
      -(windowOuter + HALF_W) / 2,
      WALL_H / 2,
      FRONT
    );
    box(
      g,
      HALF_W - windowOuter,
      WALL_H,
      0.34,
      frontMat,
      (windowOuter + HALF_W) / 2,
      WALL_H / 2,
      FRONT
    );
    for (const side of [-1, 1]) {
      box(
        g,
        windowInner - DOOR_HALF,
        WALL_H,
        0.34,
        frontMat,
        (side * (DOOR_HALF + windowInner)) / 2,
        WALL_H / 2,
        FRONT
      );
      box(g, windowWidth, 0.4, 0.34, frontMat, side * windowCenter, 0.2, FRONT);
      box(
        g,
        windowWidth,
        WALL_H - 3.02,
        0.34,
        frontMat,
        side * windowCenter,
        3.02 + (WALL_H - 3.02) / 2,
        FRONT
      );
    }
    box(
      g,
      DOOR_HALF * 2,
      WALL_H - DOOR_H,
      0.34,
      frontMat,
      0,
      DOOR_H + (WALL_H - DOOR_H) / 2,
      FRONT
    );

    // Roof slab and a readable parapet.
    box(g, 12.9, 0.3, 12.5, SHOP_MAT.roof, 0, WALL_H + 0.14, 5.8);
    box(g, 12.95, 0.5, 0.45, trimMat, 0, WALL_H + 0.38, FRONT - 0.02);
    box(g, 12.95, 0.4, 0.42, SHOP_MAT.roof, 0, WALL_H + 0.32, BACK + 0.02);
    box(g, 0.42, 0.42, 12.1, SHOP_MAT.roof, -HALF_W - 0.02, WALL_H + 0.32, 5.8);
    box(g, 0.42, 0.42, 12.1, SHOP_MAT.roof, HALF_W + 0.02, WALL_H + 0.32, 5.8);

    // Interior liners and baseboards make the shop feel finished.
    box(g, 12.3, 4.42, 0.06, wallMat, 0, 2.23, BACK - 0.16);
    box(g, 0.06, 4.42, 11.8, wallMat, -HALF_W + 0.2, 2.23, 5.8);
    box(g, 0.06, 4.42, 11.8, wallMat, HALF_W - 0.2, 2.23, 5.8);
    for (const side of [-1, 1]) {
      box(g, windowWidth - 0.1, 0.08, 0.06, wallMat, side * windowCenter, 3.0, 0.02);
      box(g, windowWidth - 0.1, 0.08, 0.06, wallMat, side * windowCenter, 0.42, 0.02);
    }
    box(g, 12.2, 0.16, 0.05, accentMat, 0, 0.16, BACK - 0.22);
    box(g, 0.05, 0.16, 11.6, accentMat, -HALF_W + 0.25, 0.16, 5.8);
    box(g, 0.05, 0.16, 11.6, accentMat, HALF_W - 0.25, 0.16, 5.8);

    // Welcome mat and shop floor lighting.
    const mat = new THREE.MeshBasicMaterial({ map: welcomeMatTexture(b), toneMapped: false });
    plane(g, 2.7, 1.35, mat, 0, 0.075, 0.85, { rotX: -Math.PI / 2 });

    const lightMat = kitMaterial(`shop-light-${b.id}`, 0xfff0ce, {
      emissive: b.glow,
      emissiveIntensity: 0.35,
      roughness: 0.4
    });
    for (const z of [3.1, 7.1, 10.1]) {
      box(g, 1.25, 0.07, 0.26, lightMat, 0, 4.44, z, { cast: false });
    }

    const light = new THREE.PointLight(0xffd9a0, 0, 15, 2);
    light.position.set(0, 3.85, 5.7);
    g.add(light);
    shop.lights.push(light);
    this.city.shopLights.push({ light, x: b.entrance.x, z: b.entrance.z + 5.7 });
  }

  // -------------------------------------------------------------------------
  // Facade, signage and window displays
  // -------------------------------------------------------------------------

  buildFacade(b, shop) {
    const g = shop.group;
    const style = b.exterior.style;
    const frameMat = style === 'clothing' ? SHOP_MAT.brass : SHOP_MAT.darkMetal;
    const windowCenter = 3.7;
    const windowWidth = 4.2;
    const glass = SHOP_MAT.glass;

    for (const side of [-1, 1]) {
      const x = side * windowCenter;
      plane(g, windowWidth, 2.56, glass, x, 1.71, FRONT - 0.19, { rotY: Math.PI });
      box(g, windowWidth + 0.14, 0.1, 0.12, frameMat, x, 3.0, FRONT - 0.18);
      box(g, windowWidth + 0.14, 0.1, 0.12, frameMat, x, 0.41, FRONT - 0.18);
      box(g, 0.1, 2.7, 0.12, frameMat, x - windowWidth / 2, 1.71, FRONT - 0.18);
      box(g, 0.1, 2.7, 0.12, frameMat, x + windowWidth / 2, 1.71, FRONT - 0.18);
      box(g, 0.08, 2.56, 0.1, frameMat, x, 1.71, FRONT - 0.18);
      box(
        g,
        windowWidth + 0.28,
        0.08,
        0.38,
        kitMaterial(`sill-${b.id}`, b.trim),
        x,
        0.42,
        FRONT - 0.24
      );

      // A shallow stage behind each window shows the shop's goods.
      this.buildWindowDisplay(b, shop, side);
    }

    // Door frame and threshold.
    box(g, 0.16, DOOR_H, 0.24, frameMat, -DOOR_HALF - 0.1, DOOR_H / 2, FRONT - 0.12);
    box(g, 0.16, DOOR_H, 0.24, frameMat, DOOR_HALF + 0.1, DOOR_H / 2, FRONT - 0.12);
    box(g, DOOR_HALF * 2 + 0.4, 0.18, 0.26, frameMat, 0, DOOR_H + 0.03, FRONT - 0.12);
    box(g, DOOR_HALF * 2 + 0.3, 0.06, 0.7, kitMaterial(`step-${b.id}`, b.trim), 0, 0.045, -0.72);

    // Sign board.
    const signMat = new THREE.MeshBasicMaterial({
      map: shopSignTexture(b),
      toneMapped: false,
      side: THREE.DoubleSide
    });
    box(g, 8.4, 1.2, 0.16, kitMaterial(`sign-frame-${b.id}`, b.accent), 0, 3.98, FRONT - 0.42);
    plane(g, 8.05, 1.0, signMat, 0, 3.98, FRONT - 0.515, { rotY: Math.PI });

    // Awning.
    const awning = new THREE.Mesh(new THREE.PlaneGeometry(9.15, 1.8), awningMaterial(b));
    awning.rotation.x = -Math.PI / 2 - 0.2;
    awning.position.set(0, 3.04, -0.98);
    awning.receiveShadow = true;
    g.add(awning);
    const awningTrim = kitMaterial(`awning-trim-${b.id}`, b.trim, { roughness: 0.82 });
    for (let i = 0; i < 8; i++) {
      const x = -3.95 + i * 1.13;
      const alternate =
        style === 'bakery' || style === 'cafe'
          ? i % 2
            ? awningTrim
            : kitMaterial(`awning-accent-${b.id}`, b.awning, { roughness: 0.85 })
          : awningTrim;
      box(g, 1.1, 0.34, 0.055, alternate, x, 2.72, -1.79, { cast: false });
    }
    box(g, 9.25, 0.07, 0.1, awningTrim, 0, 2.55, -1.8);

    // Blade sign, visible along Main Street.
    const side = b.exterior.bladeSide || 1;
    const bladeX = side * (HALF_W + 0.32);
    box(g, 0.6, 0.08, 0.1, frameMat, side * (HALF_W - 0.02), 4.22, -0.58);
    box(g, 0.16, 2.4, 1.18, kitMaterial(`blade-frame-${b.id}`, b.accent), bladeX, 3.28, -0.75);
    const bladeMat = new THREE.MeshBasicMaterial({
      map: bladeSignTexture(b),
      toneMapped: false,
      side: THREE.DoubleSide
    });
    plane(g, 1.04, 2.24, bladeMat, bladeX + side * 0.09, 3.28, -0.75, {
      rotY: side * (Math.PI / 2)
    });

    this.buildFacadeDetails(b, shop);
    this.buildSidewalkProps(b, shop);
  }

  buildWindowDisplay(b, shop, side) {
    const g = shop.group;
    const x = side * 3.7;
    const deck = new THREE.Group();
    deck.position.set(x, 0.06, 0.72);
    g.add(deck);
    box(deck, 3.9, 0.42, 1.14, kitMaterial(`window-deck-${b.id}`, b.accent), 0, 0.21, 0);
    box(deck, 3.96, 0.06, 1.2, kitMaterial(`window-top-${b.id}`, b.trim), 0, 0.45, 0);

    const goods = new THREE.Group();
    goods.position.set(x, 0.48, 0.62);
    g.add(goods);
    const style = b.exterior.style;
    if (style === 'bakery') {
      this.addBreadLoaf(goods, -1.1, 0.14, 0, 0xd7a24b, 1.45);
      this.addBreadLoaf(goods, -0.55, 0.14, 0.05, 0xb97834, 1.1);
      this.addBreadLoaf(goods, 0.1, 0.14, -0.02, 0xe0b05e, 1.25);
      cylinder(goods, 0.32, 0.32, 0.08, SHOP_MAT.cream, 1.1, 0.08, 0, { segments: 16 });
      this.addBreadLoaf(goods, 1.1, 0.22, 0, 0xc98f42, 0.85);
    } else if (style === 'cafe') {
      cylinder(goods, 0.38, 0.32, 0.06, SHOP_MAT.white, -0.8, 0.06, 0, { segments: 18 });
      cylinder(goods, 0.08, 0.09, 0.2, SHOP_MAT.metal, -0.8, 0.18, 0);
      cylinder(goods, 0.3, 0.3, 0.06, SHOP_MAT.cream, -0.8, 0.3, 0, { segments: 18 });
      this.addCup(goods, -0.35, 0.1, 0.05, 0.85);
      this.addCup(goods, 0.35, 0.1, -0.1, 1);
      box(goods, 0.7, 0.1, 0.42, SHOP_MAT.darkWood, 1.1, 0.08, 0);
      this.addCup(goods, 1.1, 0.2, 0, 1.1);
      this.addCup(goods, 1.35, 0.2, 0.08, 0.85);
    } else if (style === 'pharmacy') {
      for (const [bx, color, h] of [
        [-1.25, 0x5fb7cf, 0.48],
        [-0.85, 0xf1f4ef, 0.34],
        [-0.45, 0x62c98e, 0.42],
        [0.6, 0xf3eee2, 0.5],
        [1.0, 0x4a9fbd, 0.36]
      ]) {
        cylinder(goods, 0.11, 0.11, h, matForPerson(color), bx, h / 2, 0, { segments: 10 });
        box(goods, 0.16, 0.04, 0.16, kitMaterial('bottle-cap', 0xf2f2ec), bx, h + 0.02, 0);
      }
      this.addCross(goods, 1.45, 0.34, 0, 0x34d17a, 0.32, 0.08);
    } else if (style === 'clothing') {
      this.addDressForm(goods, -0.85, 0.02, 0.1, 0x304665, 0xc9a86a);
      this.addDressForm(goods, 0.75, 0.02, -0.15, 0xe8dcc2, 0x8a6a3d);
      box(goods, 1.5, 0.12, 0.5, SHOP_MAT.darkWood, 0.1, 0.06, 0.45);
      box(goods, 0.5, 0.2, 0.35, matForPerson(0x78435f), -0.2, 0.2, 0.45);
      box(goods, 0.45, 0.16, 0.32, matForPerson(0xd5c2a2), 0.35, 0.18, 0.45);
    } else {
      box(goods, 1.18, 0.74, 0.1, SHOP_MAT.darkMetal, -0.85, 0.55, 0.1);
      const screenMat = new THREE.MeshBasicMaterial({ map: screenTexture(1), toneMapped: false });
      plane(goods, 1.02, 0.56, screenMat, -0.85, 0.55, 0.16);
      box(goods, 0.9, 0.08, 0.4, SHOP_MAT.darkMetal, -0.85, 0.16, 0.12);
      box(goods, 0.75, 0.46, 0.12, SHOP_MAT.darkMetal, 0.65, 0.38, 0.05);
      plane(
        goods,
        0.62,
        0.32,
        new THREE.MeshBasicMaterial({ map: screenTexture(0), toneMapped: false }),
        0.65,
        0.4,
        0.12
      );
      box(goods, 0.52, 0.16, 0.32, matForPerson(0x28343c), 1.25, 0.16, 0.05);
      for (let i = 0; i < 3; i++) {
        box(goods, 0.16, 0.06, 0.16, kitBasic('led-strip', 0x36f0ff), 0.9 + i * 0.22, 0.1, 0.25, {
          cast: false
        });
      }
    }

    this.tag(deck, b, 'shopDisplay', 'Inspect window display');
    this.tag(goods, b, 'shopDisplay', 'Inspect window display');
  }

  buildFacadeDetails(b, shop) {
    const g = shop.group;
    const style = b.exterior.style;
    if (style === 'bakery') {
      for (const x of [-3.7, 3.7]) {
        box(g, 4.3, 0.2, 0.16, SHOP_MAT.darkWood, x, 3.12, -0.42);
        box(g, 4.3, 0.16, 0.14, kitMaterial('bakery-lintel', 0xb67a52), x, 0.36, -0.4);
      }
      this.addLantern(g, -5.95, 2.55, -0.55, 0xffc266);
      this.addLantern(g, 5.95, 2.55, -0.55, 0xffc266);
      box(g, 1.1, 1.9, 1.1, kitMaterial('bakery-chimney', 0x7c4a37), 4.2, 5.55, 5.2);
      box(g, 1.3, 0.16, 1.3, SHOP_MAT.roof, 4.2, 6.55, 5.2);
    } else if (style === 'cafe') {
      for (const x of [-2.15, 2.15]) {
        this.addPlanter(g, x, 0.27, -0.7, 0.42);
      }
      this.addLantern(g, -5.95, 2.55, -0.55, 0xa8e4bd);
      this.addLantern(g, 5.95, 2.55, -0.55, 0xa8e4bd);
      const nameMat = new THREE.MeshBasicMaterial({
        map: menuBoardTexture(b, 'TODAY'),
        toneMapped: false
      });
      plane(g, 1.45, 1.5, nameMat, -5.02, 1.25, -0.62, { rotY: Math.PI - 0.42 });
    } else if (style === 'pharmacy') {
      box(g, 3.8, 0.45, 0.1, kitMaterial('pharmacy-band', 0x2f8fa6), 0, 4.02, FRONT - 0.32);
      this.addCross(g, 0, 5.35, -0.45, 0x34d17a, 1.05, 0.22);
      this.addCross(g, 0, 3.07, -1.84, 0x34d17a, 0.32, 0.05);
      for (const x of [-2.7, 2.7]) this.addPlanter(g, x, 0.23, -0.7, 0.34);
    } else if (style === 'clothing') {
      for (const x of [-3.7, 3.7]) {
        const lamp = cylinder(g, 0.13, 0.13, 0.26, SHOP_MAT.brass, x, 3.12, -1.1, {
          segments: 12
        });
        lamp.rotation.x = Math.PI / 2;
        box(g, 0.36, 0.08, 0.6, SHOP_MAT.brass, x, 2.99, -0.86);
      }
      box(g, 0.32, 0.32, 0.32, SHOP_MAT.brass, 5.55, 4.16, -0.5);
      box(g, 0.09, 3.9, 0.09, SHOP_MAT.darkMetal, 6.1, 2.0, -0.5);
      const banner = new THREE.Mesh(
        new THREE.PlaneGeometry(1.0, 1.8),
        new THREE.MeshBasicMaterial({ color: b.trim, side: THREE.DoubleSide, toneMapped: false })
      );
      banner.position.set(5.57, 4.35, -0.5);
      banner.rotation.y = Math.PI / 2;
      banner.rotation.z = 0.08;
      g.add(banner);
      this.addDressForm(g, 5.0, 0.02, -1.15, 0x1b2436, 0xc9a86a, 1.2);
      box(g, 0.36, 1.1, 0.36, matForPerson(0x1a2230), 5.0, 0.55, -1.15);
      this.addLocalCollider(shop, 4.55, 5.45, -1.55, -0.75);
    } else {
      const neon = kitMaterial('neon-cyan', 0x36f0ff, {
        emissive: 0x18c6d4,
        emissiveIntensity: 2.2,
        roughness: 0.3
      });
      box(g, 9.2, 0.05, 0.05, neon, 0, 2.62, -1.85, { cast: false });
      box(g, 0.05, 3.0, 0.05, neon, -5.95, 2.1, -0.6, { cast: false });
      box(g, 0.05, 3.0, 0.05, neon, 5.95, 2.1, -0.6, { cast: false });
      box(g, 1.6, 0.28, 0.8, kitMaterial('electronics-drone', 0x222b31), 4.3, 5.25, 4.9);
      const pole = cylinder(g, 0.04, 0.05, 1.7, SHOP_MAT.metal, 4.3, 5.95, 4.9, {
        segments: 8
      });
      pole.rotation.z = Math.PI / 2;
      shop.antennaLight = sphere(g, 0.09, kitBasic('antenna-light', 0xff4a3a), 4.3, 6.15, 4.9);
      this.addCrateStack(g, -4.9, -1.2);
    }
  }

  buildSidewalkProps(b, shop) {
    const style = b.exterior.style;
    const g = shop.group;
    const boardMat = new THREE.MeshBasicMaterial({
      map: menuBoardTexture(b, style === 'cafe' ? 'FRESH' : 'TODAY'),
      toneMapped: false
    });
    if (style === 'bakery') {
      this.addSandwichBoard(g, -5.0, -1.15, 0.35, boardMat, b);
      this.addCrateStack(g, 4.85, -1.2, 0xb07a42);
    } else if (style === 'cafe') {
      this.addSandwichBoard(g, 5.0, -1.15, -0.35, boardMat, b);
      this.addPlanter(g, 4.5, 0.21, -0.55, 0.3);
    } else if (style === 'pharmacy') {
      this.addSandwichBoard(g, -4.9, -1.1, 0.25, boardMat, b);
      this.addPlanter(g, 4.6, 0.21, -0.55, 0.3);
    } else if (style === 'clothing') {
      this.addSandwichBoard(g, -4.9, -1.12, 0.3, boardMat, b);
      this.addPlanter(g, 4.4, 0.21, -0.55, 0.3);
    } else {
      this.addSandwichBoard(g, -4.9, -1.15, 0.3, boardMat, b);
      this.addCrateStack(g, 4.8, -1.2, 0x2d3b42);
    }
  }

  // -------------------------------------------------------------------------
  // Interior
  // -------------------------------------------------------------------------

  buildInterior(b, shop) {
    this.addCounter(b, shop);
    this.addBackShelves(b, shop);
    this.addActivityStation(b, shop);
    this.addStyleInterior(b, shop);

    // Menu board above the shelves.
    const menuMat = new THREE.MeshBasicMaterial({
      map: menuBoardTexture(b, SHOP_ACTIVITIES[b.id]?.title || 'TODAY'),
      toneMapped: false
    });
    plane(shop.group, 3.6, 2.25, menuMat, 0, 3.55, BACK - 0.32, { rotY: Math.PI });

    // Hanging counter sign.
    const counterSign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.1, 0.55),
      new THREE.MeshBasicMaterial({
        map: productShelfTexture(b, 'ORDER HERE'),
        toneMapped: false
      })
    );
    counterSign.position.set(0, 2.65, 7.85);
    counterSign.rotation.y = Math.PI;
    shop.group.add(counterSign);
  }

  addCounter(b, shop) {
    const fallback = () => this.makeCounterFallback(b);
    const counter = this.addFixture(shop, SHOP_GLB.counter, fallback, 0, 0.06, 7.92, Math.PI);
    this.tag(counter, b, 'business', `Talk to ${b.staff.name} — counter`);
    this.addCounterProps(b, shop);

    // A glass case on the customer side for food and pharmacy shops.
    if (['bakery', 'cafe', 'pharmacy'].includes(b.id)) {
      const glassCase = this.addFixture(
        shop,
        SHOP_GLB.displayCase,
        () => this.makeDisplayCaseFallback(b),
        -2.6,
        0.06,
        7.55,
        Math.PI
      );
      this.tag(glassCase, b, 'shopDisplay', 'Inspect the display case');
      this.addLocalCollider(shop, -3.5, -1.72, 7.15, 7.95);
    }
  }

  addCounterProps(b, shop) {
    const g = shop.group;
    const style = b.exterior.style;
    // Register is on the staff side of the counter.
    box(g, 0.58, 0.4, 0.36, SHOP_MAT.darkMetal, 0.75, 1.28, 8.18);
    box(g, 0.5, 0.2, 0.06, kitBasic('register-screen', 0xbff8ff), 0.75, 1.52, 8.0);
    box(g, 0.3, 0.05, 0.28, kitMaterial('register-key', 0x54606a), 0.75, 1.17, 8.0);

    if (style === 'bakery') {
      box(g, 1.0, 0.3, 0.62, SHOP_MAT.cream, -0.55, 1.24, 7.92);
      for (let i = 0; i < 3; i++) this.addBreadLoaf(g, -0.85 + i * 0.3, 1.45, 7.9, 0xd7a24b, 0.42);
    } else if (style === 'cafe') {
      const grinder = cylinder(g, 0.16, 0.14, 0.46, SHOP_MAT.metal, -0.8, 1.4, 8.15, {
        segments: 12
      });
      grinder.rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) this.addCup(g, -0.15 + i * 0.28, 1.32, 7.75, 0.6);
    } else if (style === 'pharmacy') {
      box(g, 0.62, 0.32, 0.5, SHOP_MAT.white, -0.7, 1.3, 8.0);
      this.addCross(g, -0.7, 1.53, 8.0, 0x34d17a, 0.16, 0.04);
      box(g, 0.9, 0.08, 0.5, SHOP_MAT.glass, -0.7, 1.48, 8.0);
    } else if (style === 'clothing') {
      box(g, 0.8, 0.18, 0.5, SHOP_MAT.darkWood, -0.65, 1.2, 8.0);
      box(g, 0.4, 0.34, 0.3, matForPerson(0x6a4358), 0.0, 1.32, 7.9);
      box(g, 0.3, 0.1, 0.34, SHOP_MAT.brass, -0.65, 1.32, 8.0);
    } else {
      box(g, 0.8, 0.22, 0.5, SHOP_MAT.darkMetal, -0.65, 1.28, 8.0);
      box(g, 0.56, 0.36, 0.08, kitBasic('repair-screen', 0x6bf3ff), -0.65, 1.53, 7.92);
    }
  }

  addBackShelves(b, shop) {
    const xs = [-4.0, -1.35, 1.35, 4.0];
    xs.forEach((x, i) => {
      const shelf = this.addFixture(
        shop,
        SHOP_GLB.shelf,
        () => this.makeShelfFallback(),
        x,
        0.06,
        10.55,
        Math.PI
      );
      if (i === 1 || i === 2) {
        const label = this.shelfLabel(b, i);
        this.tag(shelf, b, 'shopDisplay', `Browse ${label.toLowerCase()}`);
      }
      this.addShelfGoods(b, shop, x, i);
      const labelMat = new THREE.MeshBasicMaterial({
        map: productShelfTexture(b, this.shelfLabel(b, i)),
        toneMapped: false
      });
      plane(shop.group, 1.25, 0.34, labelMat, x, 2.2, 10.23, { rotY: Math.PI });
    });
    // A collider for the whole back shelf run keeps the player out of the
    // shelving while leaving the staff aisle in front.
    this.addLocalCollider(shop, -5.0, 5.0, 10.05, 11.35);
  }

  shelfLabel(b, index) {
    const labels = {
      bakery: ['BREAD', 'PASTRIES', 'CAKES', 'FLOUR'],
      cafe: ['BEANS', 'CUPS', 'TEA', 'SNACKS'],
      pharmacy: ['COLD', 'VITAMINS', 'FIRST AID', 'CARE'],
      clothing: ['SHIRTS', 'DENIM', 'KNITWEAR', 'ACCESSORIES'],
      electronics: ['PARTS', 'CABLES', 'AUDIO', 'GADGETS']
    };
    return (labels[b.id] || labels.bakery)[index] || 'GOODS';
  }

  addShelfGoods(b, shop, x, index) {
    const g = shop.group;
    const style = b.exterior.style;
    const yBase = 0.52;
    if (style === 'bakery') {
      for (let row = 0; row < 2; row++) {
        for (let i = 0; i < 3; i++) {
          this.addBreadLoaf(
            g,
            x - 0.55 + i * 0.55,
            yBase + row * 0.66,
            10.38,
            [0xd7a24b, 0xb97834, 0xe0b05e][(i + index) % 3],
            0.55,
            -0.1
          );
        }
      }
    } else if (style === 'cafe') {
      for (let row = 0; row < 2; row++) {
        for (let i = 0; i < 3; i++) {
          box(
            g,
            0.36,
            0.38,
            0.26,
            matForPerson([0x5a3a22, 0x7a4f2c, 0x3e6b4e][(i + index) % 3]),
            x - 0.5 + i * 0.5,
            yBase + 0.18 + row * 0.66,
            10.38
          );
        }
      }
    } else if (style === 'pharmacy') {
      for (let row = 0; row < 2; row++) {
        for (let i = 0; i < 4; i++) {
          const c = [0x5fb7cf, 0xf1f4ef, 0x62c98e, 0xd8a85f][(i + index) % 4];
          cylinder(
            g,
            0.09,
            0.09,
            0.38,
            matForPerson(c),
            x - 0.6 + i * 0.4,
            yBase + 0.2 + row * 0.66,
            10.38,
            { segments: 8 }
          );
        }
      }
    } else if (style === 'clothing') {
      for (let row = 0; row < 2; row++) {
        for (let i = 0; i < 3; i++) {
          box(
            g,
            0.44,
            0.16,
            0.34,
            matForPerson([0x304665, 0x78435f, 0xd5c2a2, 0x3e5c46][(i + index) % 4]),
            x - 0.5 + i * 0.5,
            yBase + 0.09 + row * 0.66,
            10.38
          );
        }
      }
    } else {
      for (let row = 0; row < 2; row++) {
        for (let i = 0; i < 3; i++) {
          box(
            g,
            0.36,
            0.22,
            0.28,
            matForPerson([0x29353d, 0x394b54, 0x1d2429][(i + index) % 3]),
            x - 0.5 + i * 0.5,
            yBase + 0.12 + row * 0.66,
            10.38
          );
        }
      }
    }
  }

  addActivityStation(b, shop) {
    const station = b.activity.station;
    const config = SHOP_ACTIVITIES[b.id];
    let file = SHOP_GLB.workbench;
    let fallback = () => this.makeWorkbenchFallback();
    if (b.id === 'bakery') {
      file = SHOP_GLB.oven;
      fallback = () => this.makeOvenFallback();
    } else if (b.id === 'cafe') {
      file = SHOP_GLB.espressoBar;
      fallback = () => this.makeEspressoFallback(b);
    } else if (b.id === 'pharmacy') {
      file = SHOP_GLB.pharmacyCounter;
      fallback = () => this.makePharmacyStationFallback();
    } else if (b.id === 'clothing') {
      file = SHOP_GLB.tailorTable;
      fallback = () => this.makeTailorFallback(b);
    }
    const slot = this.addFixture(shop, file, fallback, station.x, 0.06, station.z, station.rot);
    this.tag(slot, b, 'shopGame', config?.title || 'Work a shift');

    const markerMat = kitMaterial(`marker-${b.id}`, b.glow, {
      emissive: b.glow,
      emissiveIntensity: 1.8,
      roughness: 0.25
    });
    const marker = new THREE.Mesh(
      kitGeometry('shop-marker', () => new THREE.OctahedronGeometry(0.15, 0)),
      markerMat
    );
    marker.position.set(station.x, 2.35, station.z);
    marker.castShadow = false;
    shop.group.add(marker);
    shop.markers.push(marker);
    this.addLocalCollider(
      shop,
      station.x - 0.95,
      station.x + 0.95,
      station.z - 0.95,
      station.z + 0.95
    );
  }

  addStyleInterior(b, shop) {
    const g = shop.group;
    const style = b.exterior.style;
    if (style === 'bakery') {
      this.addFixture(shop, SHOP_GLB.table, () => this.makeTableFallback(b), 3.0, 0.06, 4.2, 0);
      for (let i = 0; i < 3; i++) this.addBreadLoaf(g, 2.65 + i * 0.35, 0.83, 4.15, 0xc98f42, 0.5);
      this.addSacks(g, 4.9, 8.8);
      this.addSacks(g, 4.4, 9.2);
      this.addLocalCollider(shop, 1.9, 4.1, 3.4, 5.0);
      this.addLocalCollider(shop, 3.9, 5.4, 8.2, 9.8);
    } else if (style === 'cafe') {
      this.addFixture(shop, SHOP_GLB.table, () => this.makeTableFallback(b), 3.0, 0.06, 4.05, 0);
      this.addFixture(shop, SHOP_GLB.table, () => this.makeTableFallback(b), 3.55, 0.06, 6.5, 0);
      this.addChair(g, 2.1, 0.06, 4.0, -Math.PI / 2);
      this.addChair(g, 3.9, 0.06, 4.0, Math.PI / 2);
      this.addChair(g, 2.65, 0.06, 6.5, -Math.PI / 2);
      this.addChair(g, 4.45, 0.06, 6.5, Math.PI / 2);
      this.addPlanter(g, 5.15, 0.225, 2.0, 0.33);
      this.addPendant(g, -3.0, 4.5, 4.0, b);
      this.addPendant(g, 0.5, 4.5, 5.7, b);
      this.addLocalCollider(shop, 1.5, 4.8, 3.2, 4.9);
      this.addLocalCollider(shop, 2.1, 5.2, 5.8, 7.3);
    } else if (style === 'pharmacy') {
      this.addChair(g, 3.4, 0.06, 6.4, Math.PI, true);
      this.addChair(g, 4.35, 0.06, 6.4, Math.PI, true);
      this.addPrivacyScreen(g, 3.1, 8.0, b);
      this.addCross(g, 5.0, 2.9, 10.2, 0x34d17a, 0.9, 0.18, Math.PI / 2);
      this.addLocalCollider(shop, 2.7, 4.9, 5.6, 7.2);
      this.addLocalCollider(shop, 2.9, 5.8, 7.6, 8.4);
    } else if (style === 'clothing') {
      this.addFixture(
        shop,
        SHOP_GLB.rack,
        () => this.makeRackFallback(b),
        -4.45,
        0.06,
        7.6,
        Math.PI / 2
      );
      this.addFixture(shop, SHOP_GLB.rack, () => this.makeRackFallback(b), -5.1, 0.06, 10.35, 0);
      this.addFixture(shop, SHOP_GLB.rack, () => this.makeRackFallback(b), -2.9, 0.06, 10.35, 0);
      this.addFittingRoom(g, b);
      this.addDressForm(g, 3.8, 0.06, 8.8, 0xb8a27b, 0x2b3a5c, 1.2);
      this.addMirror(g, 5.75, 2.0, 5.7, -Math.PI / 2, b);
      box(g, 2.4, 0.45, 0.7, SHOP_MAT.wood, 3.9, 0.28, 5.0);
      box(g, 2.2, 0.12, 0.55, matForPerson(0x8a5b3a), 3.9, 0.55, 5.0);
      for (let i = 0; i < 3; i++) {
        box(
          g,
          0.5,
          0.28,
          0.4,
          matForPerson([0x304665, 0x78435f, 0xd5c2a2][i]),
          3.2 + i * 0.7,
          0.78,
          5.0
        );
      }
      this.addLocalCollider(shop, -5.7, -3.4, 2.3, 8.9);
      this.addLocalCollider(shop, -5.9, -1.8, 9.5, 11.4);
      this.addLocalCollider(shop, 2.8, 5.7, 4.4, 5.6);
      this.addLocalCollider(shop, 2.9, 5.8, 7.4, 11.3);
    } else {
      for (let i = 0; i < 3; i++) {
        const tv = new THREE.Group();
        tv.position.set(HALF_W - 0.22, 2.4, 4.9 + i * 1.55);
        tv.rotation.y = -Math.PI / 2;
        g.add(tv);
        box(tv, 1.28, 0.78, 0.1, SHOP_MAT.darkMetal, 0, 0, 0);
        plane(
          tv,
          1.12,
          0.62,
          new THREE.MeshBasicMaterial({ map: screenTexture(i), toneMapped: false }),
          0,
          0,
          0.06
        );
      }
      box(g, 5.2, 0.24, 0.7, SHOP_MAT.darkMetal, 3.4, 0.16, 8.3);
      for (let i = 0; i < 3; i++) {
        box(
          g,
          0.55,
          0.14,
          0.4,
          matForPerson([0x28343c, 0x3d4a52, 0x1d2429][i]),
          1.8 + i * 0.7,
          0.35,
          8.3
        );
      }
      this.addPendant(g, 0.8, 4.5, 5.4, b);
      this.addLocalCollider(shop, 1.5, 5.3, 7.8, 8.9);
      this.addLocalCollider(shop, -5.6, -3.4, 2.1, 7.0);
    }
  }

  // -------------------------------------------------------------------------
  // Door, staff and shoppers
  // -------------------------------------------------------------------------

  buildDoor(b, shop) {
    const g = shop.group;
    const door = new THREE.Group();
    door.position.set(0, 0.06, FRONT - 0.08);
    g.add(door);

    const leafWidth = (b.door.width - 0.12) / 2;
    const leaves = [];
    for (const side of [-1, 1]) {
      const leaf = new THREE.Group();
      const baseX = (side * leafWidth) / 2;
      leaf.position.set(baseX, 0, 0);
      box(leaf, leafWidth - 0.06, 2.66, 0.055, SHOP_MAT.glass, 0, 1.4, 0, { cast: false });
      box(leaf, leafWidth, 0.09, 0.1, SHOP_MAT.darkMetal, 0, 2.76, 0);
      box(leaf, leafWidth, 0.14, 0.1, SHOP_MAT.darkMetal, 0, 0.07, 0);
      box(leaf, 0.09, 2.7, 0.1, SHOP_MAT.darkMetal, -leafWidth / 2, 1.4, 0);
      box(leaf, 0.09, 2.7, 0.1, SHOP_MAT.darkMetal, leafWidth / 2, 1.4, 0);
      box(leaf, 0.06, 0.6, 0.08, SHOP_MAT.brass, -side * 0.14, 1.42, 0.1);
      door.add(leaf);
      leaves.push({ group: leaf, baseX, side });
    }

    // A small door decal on the glass.
    const decalMat = new THREE.MeshBasicMaterial({
      map: productShelfTexture(b, 'OPEN'),
      toneMapped: false,
      transparent: true,
      opacity: 0.9
    });
    plane(door, 0.8, 0.3, decalMat, 0.55, 1.9, -0.11, { rotY: Math.PI });

    shop.door = {
      group: door,
      leaves,
      open: false,
      anim: 0,
      openedAt: -100,
      collider: this.city.addCollider(
        b.entrance.x - DOOR_HALF,
        b.entrance.x + DOOR_HALF,
        b.entrance.z + FRONT - 0.3,
        b.entrance.z + FRONT + 0.2
      )
    };
    this.tag(door, b, 'shopDoor', `Open ${b.shortName} door`);
  }

  buildStaff(b, shop) {
    const staff = makeShopPerson({
      role: b.staff.role,
      staff: true,
      palette: staffPalette(b.staff.role)
    });
    staff.root.position.set(0, 0.06, b.keeper.z - b.entrance.z);
    staff.root.rotation.y = Math.PI;
    shop.group.add(staff.root);
    shop.staffPerson = staff;
  }

  buildCustomers(b, shop) {
    const count = b.id === 'bakery' || b.id === 'cafe' ? 2 : 1;
    const spots = b.customerSpots || [];
    for (let i = 0; i < count; i++) {
      const person = makeShopPerson({ role: 'customer' });
      const spot = spots[(i + 1) % spots.length] || [0, 4];
      person.root.position.set(spot[0], 0.06, spot[1]);
      person.root.rotation.y = Math.PI;
      shop.group.add(person.root);
      shop.customers.push({
        ...person,
        spotIndex: (i + 1) % spots.length,
        paused: 1 + Math.random() * 2,
        speed: 0.7 + Math.random() * 0.45
      });
    }
  }

  // -------------------------------------------------------------------------
  // Interactions and colliders
  // -------------------------------------------------------------------------

  tag(object, b, type, prompt) {
    this.game.world.tagInteract(object, type, prompt);
    object.userData.interact.businessId = b.id;
  }

  addLocalCollider(shop, minX, maxX, minZ, maxZ) {
    const b = shop.business;
    return this.city.addCollider(
      b.entrance.x + minX,
      b.entrance.x + maxX,
      b.entrance.z + minZ,
      b.entrance.z + maxZ
    );
  }

  addColliders(b, shop) {
    // Back and side walls.
    this.addLocalCollider(shop, -HALF_W - 0.2, HALF_W + 0.2, BACK - 0.35, BACK + 0.2);
    this.addLocalCollider(shop, -HALF_W - 0.2, -HALF_W + 0.23, FRONT - 0.2, BACK + 0.2);
    this.addLocalCollider(shop, HALF_W - 0.23, HALF_W + 0.2, FRONT - 0.2, BACK + 0.2);
    // Front wall on either side of the doorway.
    this.addLocalCollider(shop, -HALF_W, -DOOR_HALF, FRONT - 0.4, FRONT + 0.2);
    this.addLocalCollider(shop, DOOR_HALF, HALF_W, FRONT - 0.4, FRONT + 0.2);
    // Display stages immediately inside the windows.
    this.addLocalCollider(shop, -5.75, -1.7, 0.08, 1.35);
    this.addLocalCollider(shop, 1.7, 5.75, 0.08, 1.35);
    // Counter.
    this.addLocalCollider(shop, -1.8, 1.8, 7.35, 8.45);
    // Door frame posts (narrow but solid).
    this.addLocalCollider(shop, -DOOR_HALF - 0.18, -DOOR_HALF, FRONT - 0.3, FRONT + 0.05);
    this.addLocalCollider(shop, DOOR_HALF, DOOR_HALF + 0.18, FRONT - 0.3, FRONT + 0.05);
  }

  toggleDoor(businessId) {
    const shop = this.shops.get(businessId);
    if (!shop?.door) return false;
    shop.door.open = !shop.door.open;
    shop.door.openedAt = this.time;
    if (this.game.audio) this.game.audio.play(shop.door.open ? 'pick' : 'place');
    this.game.ui.toast(
      shop.door.open
        ? `${shop.business.shortName} door opened`
        : `${shop.business.shortName} door closed`
    );
    return shop.door.open;
  }

  doorPrompt(businessId) {
    const shop = this.shops.get(businessId);
    if (!shop) return '';
    return shop.door?.open ? 'Close the shop door' : 'Open the shop door';
  }

  isDoorOpen(businessId) {
    return !!this.shops.get(businessId)?.door?.open;
  }

  // -------------------------------------------------------------------------
  // Update loop
  // -------------------------------------------------------------------------

  update(dt, time) {
    this.time = time;
    const now = performance.now() / 1000;
    const player = this.game.player?.pos;
    for (const shop of this.shops.values()) {
      const b = shop.business;
      const door = shop.door;
      if (door) {
        const target = door.open ? 1 : 0;
        door.anim += (target - door.anim) * Math.min(1, dt * 8);
        if (Math.abs(target - door.anim) < 0.005) door.anim = target;
        const offset = ease(door.anim) * 1.45;
        for (const leaf of door.leaves) {
          leaf.group.position.x = leaf.baseX + leaf.side * offset;
          leaf.group.position.z = -ease(door.anim) * 0.04;
        }
        door.collider.disabled = door.anim > 0.28;
        if (
          door.open &&
          door.anim > 0.9 &&
          time - door.openedAt > 8 &&
          !this.playerInside(b, player) &&
          (!player || Math.hypot(player.x - b.entrance.x, player.z - b.entrance.z) > 3.2)
        ) {
          door.open = false;
          door.openedAt = time;
        }
      }
      // Work-station marker bob.
      for (let i = 0; i < shop.markers.length; i++) {
        const marker = shop.markers[i];
        marker.rotation.y = time * 1.5 + i;
        marker.position.y = 2.35 + Math.sin(time * 2.4 + i) * 0.08;
      }
      if (shop.staffPerson) animateShopPerson(shop.staffPerson, dt, time, false);
      for (const customer of shop.customers) {
        this.updateCustomer(customer, shop, dt, time);
      }
    }
    // Blink the electronics antenna.
    const antenna = this.shops.get('electronics')?.antennaLight;
    if (antenna) antenna.visible = Math.sin(now * 4) > 0;
  }

  playerInside(b, player) {
    if (!player) return false;
    return (
      player.x > b.building.minX &&
      player.x < b.building.maxX &&
      player.z > b.building.minZ &&
      player.z < b.building.maxZ
    );
  }

  updateCustomer(customer, shop, dt, time) {
    const spots = shop.business.customerSpots || [];
    if (!spots.length) return;
    if (customer.paused > 0) {
      customer.paused -= dt;
      animateShopPerson(customer, dt, time, false);
      return;
    }
    const target = spots[customer.spotIndex % spots.length];
    const dx = target[0] - customer.root.position.x;
    const dz = target[1] - customer.root.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.16) {
      customer.paused = 1.4 + Math.random() * 3.2;
      customer.spotIndex = (customer.spotIndex + 1 + Math.floor(Math.random() * 2)) % spots.length;
      animateShopPerson(customer, dt, time, false);
      return;
    }
    const step = Math.min(distance, customer.speed * dt);
    customer.root.position.x += (dx / distance) * step;
    customer.root.position.z += (dz / distance) * step;
    customer.root.rotation.y = Math.atan2(dx, dz);
    animateShopPerson(customer, dt, time, true);
  }

  // -------------------------------------------------------------------------
  // Procedural fallbacks (used until the GLB fixtures arrive, or if missing)
  // -------------------------------------------------------------------------

  addFixture(shop, file, makeFallback, x, y, z, rotY) {
    const slot = new THREE.Group();
    slot.position.set(x, y, z);
    slot.rotation.y = rotY;
    shop.group.add(slot);
    const fallback = makeFallback();
    slot.add(fallback);
    shop.fixtures.push(slot);
    cloneModel(file)
      .then((model) => {
        if (!model) return;
        slot.remove(fallback);
        disposeObject3D(fallback);
        model.traverse((o) => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
          }
        });
        slot.add(model);
      })
      .catch((err) => console.warn(`[ShopWorld] ${file} skipped.`, err));
    return slot;
  }

  makeCounterFallback(b) {
    const g = new THREE.Group();
    const body = kitMaterial(`counter-body-${b.id}`, b.accent, { roughness: 0.82 });
    const top = kitMaterial(`counter-top-${b.id}`, b.color, { roughness: 0.55 });
    box(g, 3.4, 1.0, 0.85, body, 0, 0.5, 0);
    box(g, 3.55, 0.1, 1.0, top, 0, 1.04, 0);
    box(g, 3.2, 0.08, 0.72, SHOP_MAT.darkWood, 0, 0.32, 0.04);
    return g;
  }

  makeShelfFallback() {
    const g = new THREE.Group();
    box(g, 1.8, 2.15, 0.55, SHOP_MAT.wood, 0, 1.08, 0);
    box(g, 1.65, 0.06, 0.48, SHOP_MAT.darkWood, 0, 0.38, 0.02);
    box(g, 1.65, 0.06, 0.48, SHOP_MAT.darkWood, 0, 1.02, 0.02);
    box(g, 1.65, 0.06, 0.48, SHOP_MAT.darkWood, 0, 1.66, 0.02);
    box(g, 0.08, 2.15, 0.55, SHOP_MAT.darkWood, -0.86, 1.08, 0);
    box(g, 0.08, 2.15, 0.55, SHOP_MAT.darkWood, 0.86, 1.08, 0);
    return g;
  }

  makeDisplayCaseFallback(b) {
    const g = new THREE.Group();
    const frame = kitMaterial(`case-frame-${b.id}`, b.trim, { roughness: 0.45 });
    box(g, 1.7, 0.7, 0.65, SHOP_MAT.darkWood, 0, 0.35, 0);
    box(g, 1.75, 0.06, 0.7, frame, 0, 0.72, 0);
    box(g, 1.62, 0.58, 0.6, SHOP_MAT.glass, 0, 1.03, 0);
    box(g, 1.7, 0.06, 0.65, frame, 0, 1.34, 0);
    return g;
  }

  makeOvenFallback() {
    const g = new THREE.Group();
    const brick = kitMaterial('oven-brick', 0x8e4932, { roughness: 0.92 });
    box(g, 1.7, 1.65, 0.95, brick, 0, 0.83, 0);
    box(g, 1.3, 0.8, 0.08, SHOP_MAT.darkMetal, 0, 0.78, 0.51);
    box(g, 1.4, 0.06, 0.14, SHOP_MAT.metal, 0, 0.98, 0.58);
    box(g, 1.8, 0.12, 1.02, kitMaterial('oven-top', 0x3d2a22), 0, 1.71, 0);
    box(g, 0.32, 1.1, 0.32, kitMaterial('oven-flue', 0x3c4146), 0.5, 2.2, -0.2);
    return g;
  }

  makeEspressoFallback(b) {
    const g = new THREE.Group();
    box(g, 1.9, 1.0, 0.8, kitMaterial('cafe-bar-body', b.accent, { roughness: 0.8 }), 0, 0.5, 0);
    box(g, 2.0, 0.08, 0.88, SHOP_MAT.wood, 0, 1.04, 0);
    box(g, 0.9, 0.52, 0.5, SHOP_MAT.metal, -0.25, 1.36, 0);
    box(g, 0.45, 0.16, 0.4, SHOP_MAT.darkMetal, -0.25, 1.69, 0);
    box(g, 0.22, 0.45, 0.22, SHOP_MAT.darkMetal, 0.27, 1.25, 0.1);
    for (let i = 0; i < 4; i++) this.addCup(g, 0.15 + i * 0.22, 1.1, 0.24, 0.55);
    return g;
  }

  makePharmacyStationFallback() {
    const g = new THREE.Group();
    box(g, 1.8, 1.0, 0.72, SHOP_MAT.white, 0, 0.5, 0);
    box(g, 1.9, 0.08, 0.8, SHOP_MAT.metal, 0, 1.04, 0);
    box(g, 1.45, 0.62, 0.56, SHOP_MAT.glass, 0, 1.42, -0.02);
    box(g, 1.5, 0.05, 0.6, SHOP_MAT.metal, 0, 1.75, -0.02);
    this.addCross(g, 0.62, 1.46, 0.3, 0x34d17a, 0.22, 0.05);
    return g;
  }

  makeTailorFallback(b) {
    const g = new THREE.Group();
    box(g, 1.95, 0.12, 0.85, SHOP_MAT.wood, 0, 0.92, 0);
    box(g, 0.14, 0.9, 0.14, SHOP_MAT.darkWood, -0.72, 0.45, 0);
    box(g, 0.14, 0.9, 0.14, SHOP_MAT.darkWood, 0.72, 0.45, 0);
    box(g, 0.55, 0.18, 0.35, SHOP_MAT.metal, -0.3, 1.07, 0);
    box(g, 0.3, 0.3, 0.26, matForPerson(b.color), 0.35, 1.12, 0);
    this.addDressForm(g, 1.25, 0.0, -0.1, b.trim, b.accent, 0.5);
    return g;
  }

  makeWorkbenchFallback() {
    const g = new THREE.Group();
    box(g, 2.0, 0.16, 0.8, SHOP_MAT.wood, 0, 0.92, 0);
    box(g, 0.12, 0.9, 0.12, SHOP_MAT.metal, -0.82, 0.45, -0.28);
    box(g, 0.12, 0.9, 0.12, SHOP_MAT.metal, 0.82, 0.45, -0.28);
    box(g, 0.12, 0.9, 0.12, SHOP_MAT.metal, -0.82, 0.45, 0.28);
    box(g, 0.12, 0.9, 0.12, SHOP_MAT.metal, 0.82, 0.45, 0.28);
    box(g, 0.8, 0.42, 0.1, SHOP_MAT.darkMetal, -0.25, 1.3, 0);
    box(g, 0.72, 0.28, 0.03, kitBasic('workbench-screen', 0x6bf3ff), -0.25, 1.3, 0.06);
    box(g, 0.5, 0.16, 0.3, SHOP_MAT.darkMetal, 0.45, 1.1, 0);
    return g;
  }

  makeTableFallback(b) {
    const g = new THREE.Group();
    const top = kitMaterial(`table-top-${b.id}`, b.color, { roughness: 0.62 });
    g.add(this.roundTable(top, 1.0, 0.08, 0.76));
    return g;
  }

  roundTable(material, diameter, thickness, height) {
    const g = new THREE.Group();
    const top = new THREE.Mesh(
      kitGeometry(
        `table-${diameter}`,
        () => new THREE.CylinderGeometry(diameter / 2, diameter / 2, thickness, 18)
      ),
      material
    );
    top.position.y = height;
    top.castShadow = true;
    g.add(top);
    const stem = new THREE.Mesh(
      kitGeometry(
        'table-stem',
        () => new THREE.CylinderGeometry(0.06, 0.08, height - thickness, 8)
      ),
      SHOP_MAT.metal
    );
    stem.position.y = (height - thickness) / 2;
    stem.castShadow = true;
    g.add(stem);
    const foot = new THREE.Mesh(
      kitGeometry('table-foot', () => new THREE.CylinderGeometry(0.3, 0.34, 0.05, 12)),
      SHOP_MAT.metal
    );
    foot.position.y = 0.025;
    g.add(foot);
    return g;
  }

  makeRackFallback() {
    const g = new THREE.Group();
    box(g, 0.06, 1.8, 0.06, SHOP_MAT.metal, -0.95, 0.9, 0);
    box(g, 0.06, 1.8, 0.06, SHOP_MAT.metal, 0.95, 0.9, 0);
    box(g, 1.95, 0.06, 0.06, SHOP_MAT.metal, 0, 1.72, 0);
    box(g, 1.55, 0.06, 0.06, SHOP_MAT.metal, 0, 1.15, 0);
    for (let i = 0; i < 5; i++) {
      box(
        g,
        0.42,
        0.9,
        0.14,
        matForPerson([0x304665, 0x78435f, 0xd5c2a2, 0x3e5c46, 0x6b3f33][i]),
        -0.7 + i * 0.35,
        1.48,
        0.02
      );
    }
    return g;
  }

  // -------------------------------------------------------------------------
  // Small decorative helpers
  // -------------------------------------------------------------------------

  addBreadLoaf(parent, x, y, z, color, scale = 1, rot = 0) {
    const loaf = sphere(parent, 0.26, matForPerson(color), x, y, z, { segments: 12 });
    loaf.scale.set(1.55 * scale, 0.72 * scale, 0.9 * scale);
    loaf.rotation.y = rot;
    loaf.rotation.z = 0.05;
    return loaf;
  }

  addCup(parent, x, y, z, scale = 1) {
    const cup = new THREE.Group();
    cup.position.set(x, y, z);
    cup.scale.setScalar(scale);
    parent.add(cup);
    cylinder(cup, 0.09, 0.07, 0.13, SHOP_MAT.white, 0, 0.065, 0, { segments: 10 });
    const handle = new THREE.Mesh(
      kitGeometry('cup-handle', () => new THREE.TorusGeometry(0.055, 0.012, 5, 10, Math.PI)),
      SHOP_MAT.white
    );
    handle.position.set(0.09, 0.07, 0);
    handle.rotation.z = -Math.PI / 2;
    cup.add(handle);
    cylinder(cup, 0.065, 0.065, 0.012, kitMaterial('coffee-liquid', 0x5a3320), 0, 0.128, 0, {
      segments: 10,
      cast: false
    });
    return cup;
  }

  addCross(parent, x, y, z, color, size = 0.6, depth = 0.12, rotY = 0) {
    const material = kitMaterial(`cross-${color}`, color, {
      emissive: color,
      emissiveIntensity: 0.8,
      roughness: 0.4
    });
    const cross = new THREE.Group();
    cross.position.set(x, y, z);
    cross.rotation.y = rotY;
    parent.add(cross);
    box(cross, size * 0.3, size, depth, material, 0, 0, 0, { cast: false });
    box(cross, size, size * 0.3, depth, material, 0, 0, 0, { cast: false });
    return cross;
  }

  addLantern(parent, x, y, z, color) {
    box(parent, 0.06, 0.4, 0.06, SHOP_MAT.darkMetal, x, y + 0.3, z);
    box(
      parent,
      0.28,
      0.36,
      0.22,
      kitMaterial(`lantern-${color}`, color, {
        emissive: color,
        emissiveIntensity: 1.2,
        roughness: 0.35
      }),
      x,
      y,
      z,
      { cast: false }
    );
    return null;
  }

  addPlanter(parent, x, y, z, scale = 0.4) {
    const pot = kitMaterial(`planter-${scale}`, 0x8d5b3c, { roughness: 0.92 });
    box(parent, scale * 1.4, scale, scale * 1.4, pot, x, y, z);
    sphere(parent, scale * 0.55, SHOP_MAT.leaf, x, y + scale * 0.7, z, { segments: 10 });
    sphere(
      parent,
      scale * 0.38,
      SHOP_MAT.leaf,
      x - scale * 0.35,
      y + scale * 0.5,
      z + scale * 0.2,
      {
        segments: 8
      }
    );
    sphere(
      parent,
      scale * 0.32,
      SHOP_MAT.leaf,
      x + scale * 0.32,
      y + scale * 0.55,
      z - scale * 0.15,
      {
        segments: 8
      }
    );
  }

  addSandwichBoard(parent, x, z, rotY, material, b) {
    const board = new THREE.Group();
    board.position.set(x, 0.06, z);
    board.rotation.y = rotY;
    parent.add(board);
    const frame = kitMaterial('board-frame', 0x5b3b22, { roughness: 0.9 });
    for (const side of [-1, 1]) {
      const panel = plane(board, 0.76, 1.05, material, 0, 0.75, side * 0.14, {
        rotX: side * 0.18,
        rotY: side === 1 ? 0 : Math.PI
      });
      panel.material.side = THREE.DoubleSide;
      box(board, 0.82, 0.06, 0.06, frame, 0, 1.28, side * 0.14);
    }
    box(board, 0.82, 0.06, 0.4, frame, 0, 0.16, 0);
    this.game.city.addCollider(
      this.shops.get(b.id).business.entrance.x + x - 0.45,
      this.shops.get(b.id).business.entrance.x + x + 0.45,
      this.shops.get(b.id).business.entrance.z + z - 0.35,
      this.shops.get(b.id).business.entrance.z + z + 0.35
    );
  }

  addCrateStack(parent, x, z, color = 0x8b6a42) {
    const crateMat = kitMaterial(`crate-${color}`, color, { roughness: 0.95 });
    box(parent, 0.75, 0.45, 0.65, crateMat, x, 0.29, z);
    box(parent, 0.6, 0.36, 0.52, crateMat, x + 0.1, 0.69, z + 0.06);
    box(parent, 0.5, 0.3, 0.45, crateMat, x - 0.08, 1.0, z - 0.05);
  }

  addChair(parent, x, y, z, rotY, plain = false) {
    const chair = new THREE.Group();
    chair.position.set(x, y, z);
    chair.rotation.y = rotY;
    parent.add(chair);
    const seatMat = plain ? SHOP_MAT.darkMetal : SHOP_MAT.wood;
    box(chair, 0.5, 0.07, 0.5, seatMat, 0, 0.48, 0);
    box(chair, 0.5, 0.48, 0.06, plain ? SHOP_MAT.darkMetal : SHOP_MAT.wood, 0, 0.72, -0.23);
    for (const side of [-1, 1]) {
      for (const zz of [-0.2, 0.2]) {
        box(chair, 0.05, 0.48, 0.05, SHOP_MAT.darkMetal, side * 0.19, 0.24, zz);
      }
    }
    return chair;
  }

  addPendant(parent, x, y, z, b) {
    const shade = new THREE.Mesh(
      kitGeometry('pendant-shade', () => new THREE.ConeGeometry(0.3, 0.28, 14, 1, true)),
      kitMaterial(`pendant-${b.id}`, b.trim, { roughness: 0.5, side: THREE.DoubleSide })
    );
    shade.position.set(x, y - 0.5, z);
    shade.rotation.x = Math.PI;
    parent.add(shade);
    cylinder(parent, 0.02, 0.02, 0.55, SHOP_MAT.darkMetal, x, y - 0.2, z);
    sphere(parent, 0.09, kitBasic(`pendant-bulb-${b.id}`, 0xffdf9e), x, y - 0.58, z, {
      segments: 8
    });
  }

  addPrivacyScreen(parent, x, z, b) {
    const screen = new THREE.Group();
    screen.position.set(x, 0.06, z);
    parent.add(screen);
    for (let i = 0; i < 3; i++) {
      const panel = box(
        screen,
        0.8,
        1.85,
        0.06,
        kitMaterial(`screen-${b.id}-${i}`, i % 2 ? b.trim : b.color, { roughness: 0.85 }),
        i * 0.78 - 0.78,
        0.95,
        0
      );
      panel.rotation.y = -i * 0.12;
    }
  }

  addFittingRoom(parent, b) {
    const room = new THREE.Group();
    room.position.set(4.55, 0.06, 9.7);
    parent.add(room);
    box(room, 2.1, 2.5, 0.08, kitMaterial('fitting-back', b.accent), 0, 1.25, 1.15);
    box(room, 0.08, 2.5, 2.3, kitMaterial('fitting-side', b.accent), -1.0, 1.25, 0);
    box(room, 0.08, 2.5, 2.3, kitMaterial('fitting-side', b.accent), 1.0, 1.25, 0);
    box(room, 2.1, 0.18, 2.3, kitMaterial('fitting-top', b.trim), 0, 2.45, 0);
    // Curtain across the front.
    for (let i = 0; i < 8; i++) {
      box(
        room,
        0.23,
        2.25,
        0.05,
        kitMaterial(`curtain-${i % 2 ? b.trim : b.color}`, i % 2 ? b.trim : b.color, {
          roughness: 0.95
        }),
        -0.8 + i * 0.23,
        1.2,
        -1.12
      );
    }
    box(room, 2.4, 0.05, 0.05, SHOP_MAT.brass, 0, 2.38, -1.14);
    // A fitting mirror inside the room.
    this.addMirror(room, 0, 1.3, 1.02, Math.PI, b);
  }

  addMirror(parent, x, y, z, rotY, b) {
    const mirror = new THREE.Group();
    mirror.position.set(x, y, z);
    mirror.rotation.y = rotY;
    parent.add(mirror);
    box(
      mirror,
      1.1,
      2.0,
      0.08,
      kitMaterial('mirror-frame', b.exterior.style === 'clothing' ? 0xc9a86a : 0x53606a, {
        metalness: 0.35,
        roughness: 0.4
      }),
      0,
      0,
      0
    );
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(0.96, 1.86),
      kitMaterial('mirror-glass', 0xc8e3e6, {
        metalness: 0.7,
        roughness: 0.08,
        side: THREE.DoubleSide
      })
    );
    glass.position.z = 0.05;
    mirror.add(glass);
    return mirror;
  }

  addDressForm(parent, x, y, z, bodyColor, accentColor, scale = 1) {
    const form = new THREE.Group();
    form.position.set(x, y, z);
    form.scale.setScalar(scale);
    parent.add(form);
    box(form, 0.6, 0.06, 0.6, SHOP_MAT.darkMetal, 0, 0.03, 0);
    cylinder(form, 0.04, 0.05, 0.7, SHOP_MAT.metal, 0, 0.38, 0);
    const torso = new THREE.Mesh(
      kitGeometry('dress-torso', () => new THREE.CylinderGeometry(0.18, 0.28, 0.64, 10)),
      matForPerson(bodyColor)
    );
    torso.position.y = 1.0;
    torso.castShadow = true;
    form.add(torso);
    const collar = new THREE.Mesh(
      kitGeometry('dress-collar', () => new THREE.TorusGeometry(0.18, 0.025, 6, 14)),
      matForPerson(accentColor)
    );
    collar.position.y = 1.32;
    collar.rotation.x = Math.PI / 2;
    form.add(collar);
    cylinder(form, 0.035, 0.035, 0.28, SHOP_MAT.metal, 0, 1.5, 0);
    box(form, 0.36, 0.04, 0.14, matForPerson(accentColor), 0.0, 1.4, 0.16);
    return form;
  }

  addSacks(parent, x, z) {
    const sackMat = kitMaterial('flour-sack', 0xd9c7a2, { roughness: 0.98 });
    for (let i = 0; i < 3; i++) {
      box(parent, 0.62, 0.75 - i * 0.15, 0.5, sackMat, x, 0.38 + i * 0.02, z - i * 0.1);
      box(parent, 0.64, 0.12, 0.1, kitMaterial('sack-tie', 0x8a6a42), x, 0.12, z - i * 0.1 + 0.24);
    }
  }
}
