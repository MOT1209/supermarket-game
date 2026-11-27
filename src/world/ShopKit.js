import * as THREE from 'three';
import { makeCanvas } from '../utils/textures.js';

// Shared geometry and materials for every storefront. The shop kit is loaded
// once and reused by all five businesses: only the sign art, facade texture and
// a handful of accent colours differ.

const materialCache = new Map();
const basicCache = new Map();
const geometryCache = new Map();
const textureCache = new Map();

export function kitMaterial(key, color, options = {}) {
  if (!materialCache.has(key)) {
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.82,
      metalness: 0,
      ...options
    });
    material.userData.shared = true;
    materialCache.set(key, material);
  }
  return materialCache.get(key);
}

export function kitBasic(key, color, options = {}) {
  if (!basicCache.has(key)) {
    const material = new THREE.MeshBasicMaterial({ color, ...options });
    material.userData.shared = true;
    basicCache.set(key, material);
  }
  return basicCache.get(key);
}

export function kitGeometry(key, factory) {
  if (!geometryCache.has(key)) geometryCache.set(key, factory());
  const geometry = geometryCache.get(key);
  geometry.userData.shared = true;
  return geometry;
}

export function unitBox() {
  return kitGeometry('unit-box', () => new THREE.BoxGeometry(1, 1, 1));
}

export function box(parent, w, h, d, material, x, y, z, options = {}) {
  const mesh = new THREE.Mesh(unitBox(), material);
  mesh.scale.set(w, h, d);
  mesh.position.set(x, y, z);
  if (options.rotation) mesh.rotation.set(...options.rotation);
  else if (options.rotY) mesh.rotation.y = options.rotY;
  mesh.castShadow = options.cast !== false;
  mesh.receiveShadow = options.receive !== false;
  parent.add(mesh);
  return mesh;
}

export function plane(parent, w, h, material, x, y, z, options = {}) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(options.rotX ?? 0, options.rotY ?? 0, options.rotZ ?? 0);
  mesh.castShadow = false;
  mesh.receiveShadow = options.receive !== false;
  parent.add(mesh);
  return mesh;
}

export function circle(parent, radius, material, x, y, z, options = {}) {
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 28), material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(options.rotX ?? 0, options.rotY ?? 0, options.rotZ ?? 0);
  parent.add(mesh);
  return mesh;
}

export function cylinder(parent, radiusTop, radiusBottom, height, material, x, y, z, options = {}) {
  const mesh = new THREE.Mesh(
    kitGeometry(`cylinder-${radiusTop}-${radiusBottom}-${height}-${options.segments || 10}`, () =>
      new THREE.CylinderGeometry(radiusTop, radiusBottom, height, options.segments || 10)
    ),
    material
  );
  mesh.position.set(x, y, z);
  if (options.rotation) mesh.rotation.set(...options.rotation);
  mesh.castShadow = options.cast !== false;
  mesh.receiveShadow = options.receive !== false;
  parent.add(mesh);
  return mesh;
}

export function sphere(parent, radius, material, x, y, z, options = {}) {
  const mesh = new THREE.Mesh(
    kitGeometry(`sphere-${radius}-${options.segments || 10}`, () =>
      new THREE.SphereGeometry(radius, options.segments || 10, options.segments || 8)
    ),
    material
  );
  mesh.position.set(x, y, z);
  mesh.scale.setScalar(options.scale || 1);
  mesh.castShadow = options.cast !== false;
  parent.add(mesh);
  return mesh;
}

// ---------------------------------------------------------------------------
// Materials and textures
// ---------------------------------------------------------------------------

const GLASS = () =>
  kitMaterial('shop-glass', 0xc9f2fa, {
    transparent: true,
    opacity: 0.2,
    roughness: 0.06,
    metalness: 0.15,
    depthWrite: false,
    side: THREE.DoubleSide
  });

export const SHOP_MAT = {
  get glass() {
    return GLASS();
  },
  get metal() {
    return kitMaterial('shop-metal', 0x59646c, { metalness: 0.6, roughness: 0.38 });
  },
  get darkMetal() {
    return kitMaterial('shop-dark-metal', 0x20262b, { metalness: 0.5, roughness: 0.45 });
  },
  get brass() {
    return kitMaterial('shop-brass', 0xc9a86a, { metalness: 0.65, roughness: 0.3 });
  },
  get wood() {
    return kitMaterial('shop-wood', 0x7a5538, { roughness: 0.88 });
  },
  get darkWood() {
    return kitMaterial('shop-dark-wood', 0x4b321f, { roughness: 0.9 });
  },
  get white() {
    return kitMaterial('shop-white', 0xf2eee2, { roughness: 0.85 });
  },
  get cream() {
    return kitMaterial('shop-cream', 0xe8dcc4, { roughness: 0.9 });
  },
  get wall() {
    return kitMaterial('shop-wall', 0xf2ead9, { roughness: 0.92 });
  },
  get accentWall() {
    return kitMaterial('shop-accent-wall', 0xd7c6a8, { roughness: 0.9 });
  },
  get roof() {
    return kitMaterial('shop-roof', 0x3b4145, { roughness: 0.95 });
  },
  get soil() {
    return kitMaterial('shop-soil', 0x3b2a1e, { roughness: 1 });
  },
  get leaf() {
    return kitMaterial('shop-leaf', 0x3f824a, { roughness: 0.9 });
  }
};

function cachedTexture(key, make) {
  if (!textureCache.has(key)) textureCache.set(key, make());
  return textureCache.get(key);
}

const repeat = (texture, x, y) => {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(x, y);
  return texture;
};

function facadeTexture(business) {
  return cachedTexture(`facade-${business.id}`, () => {
    const style = business.exterior.style;
    const texture = makeCanvas(
      (x, w, h) => {
        if (style === 'bakery') {
          x.fillStyle = '#c4a087';
          x.fillRect(0, 0, w, h);
          const bw = 42;
          const bh = 20;
          for (let row = 0; row < h / bh; row++) {
            for (let col = -1; col < w / bw + 1; col++) {
              const offset = row % 2 ? bw / 2 : 0;
              const shade = 125 + Math.floor(Math.random() * 34);
              x.fillStyle = `rgb(${shade + 45},${shade - 10},${shade - 42})`;
              x.fillRect(col * bw + offset + 2, row * bh + 2, bw - 4, bh - 4);
            }
          }
        } else if (style === 'cafe') {
          x.fillStyle = '#24503b';
          x.fillRect(0, 0, w, h);
          for (let i = 0; i < w; i += 28) {
            x.fillStyle = i % 56 ? '#2c5c44' : '#204632';
            x.fillRect(i, 0, 26, h);
            x.fillStyle = 'rgba(230,215,180,.08)';
            x.fillRect(i + 3, 0, 2, h);
          }
          x.fillStyle = 'rgba(0,0,0,.12)';
          for (let i = 0; i < 40; i++) x.fillRect(0, Math.random() * h, w, 1);
        } else if (style === 'pharmacy') {
          x.fillStyle = '#c7dfd8';
          x.fillRect(0, 0, w, h);
          for (let yy = 0; yy < h; yy += 32) {
            for (let xx = 0; xx < w; xx += 32) {
              x.fillStyle = (xx / 32 + yy / 32) % 2 ? '#eef8f4' : '#e2f0eb';
              x.fillRect(xx + 1, yy + 1, 30, 30);
            }
          }
          x.fillStyle = 'rgba(47,143,166,.14)';
          x.fillRect(0, h * 0.68, w, 14);
        } else if (style === 'clothing') {
          x.fillStyle = '#222b42';
          x.fillRect(0, 0, w, h);
          for (let i = 0; i < w; i += 64) {
            x.fillStyle = 'rgba(255,255,255,.035)';
            x.fillRect(i, 0, 2, h);
            x.fillStyle = 'rgba(0,0,0,.12)';
            x.fillRect(i + 30, 0, 1, h);
          }
          x.strokeStyle = 'rgba(201,168,106,.25)';
          x.lineWidth = 2;
          x.strokeRect(12, 12, w - 24, h - 24);
        } else {
          x.fillStyle = '#232a30';
          x.fillRect(0, 0, w, h);
          for (let i = 0; i < h; i += 18) {
            x.fillStyle = i % 36 ? 'rgba(255,255,255,.025)' : 'rgba(0,0,0,.2)';
            x.fillRect(0, i, w, 8);
          }
          x.strokeStyle = 'rgba(54,240,255,.22)';
          x.lineWidth = 1;
          for (let i = 0; i < 8; i++) {
            x.beginPath();
            x.moveTo(0, Math.random() * h);
            x.lineTo(w, Math.random() * h);
            x.stroke();
          }
        }
      },
      256,
      256
    );
    return repeat(texture, 2.4, 2.4);
  });
}

export function facadeMaterial(business) {
  return cachedTexture(`facade-material-${business.id}`, () => {
    const material = new THREE.MeshStandardMaterial({
      map: facadeTexture(business),
      color: 0xffffff,
      roughness: 0.85
    });
    material.userData.shared = true;
    return material;
  });
}

export function floorMaterial(business) {
  return cachedTexture(`floor-material-${business.id}`, () => {
    const style = business.exterior.style;
    const texture = repeat(
      makeCanvas(
        (x, w, h) => {
          if (style === 'bakery') {
            x.fillStyle = '#8c4d30';
            x.fillRect(0, 0, w, h);
            for (let yy = 0; yy < h; yy += 64) {
              for (let xx = 0; xx < w; xx += 64) {
                x.fillStyle = (xx / 64 + yy / 64) % 2 ? '#9a5b3b' : '#7c432b';
                x.fillRect(xx + 2, yy + 2, 60, 60);
                x.strokeStyle = 'rgba(50,25,15,.25)';
                x.strokeRect(xx + 2, yy + 2, 60, 60);
              }
            }
          } else if (style === 'cafe') {
            x.fillStyle = '#7a5838';
            x.fillRect(0, 0, w, h);
            for (let yy = 0; yy < h; yy += 42) {
              x.fillStyle = yy % 84 ? '#8a6441' : '#715033';
              x.fillRect(0, yy, w, 40);
              x.fillStyle = 'rgba(30,18,10,.25)';
              x.fillRect(0, yy + 40, w, 2);
              for (let i = 0; i < 4; i++) {
                x.fillStyle = 'rgba(50,30,15,.12)';
                x.fillRect(Math.random() * w, yy + Math.random() * 34, 50, 1);
              }
            }
          } else if (style === 'pharmacy') {
            for (let yy = 0; yy < h; yy += 48) {
              for (let xx = 0; xx < w; xx += 48) {
                x.fillStyle = (xx / 48 + yy / 48) % 2 ? '#dcebe8' : '#c4ded9';
                x.fillRect(xx, yy, 48, 48);
              }
            }
            x.strokeStyle = 'rgba(70,120,115,.22)';
            for (let i = 0; i <= w; i += 48) {
              x.beginPath();
              x.moveTo(i, 0);
              x.lineTo(i, h);
              x.stroke();
              x.beginPath();
              x.moveTo(0, i);
              x.lineTo(w, i);
              x.stroke();
            }
          } else if (style === 'clothing') {
            x.fillStyle = '#b79b74';
            x.fillRect(0, 0, w, h);
            for (let yy = 0; yy < h; yy += 34) {
              x.fillStyle = yy % 68 ? '#c2a87f' : '#ad9169';
              x.fillRect(0, yy, w, 32);
              x.fillStyle = 'rgba(70,50,30,.18)';
              x.fillRect(0, yy + 32, w, 2);
            }
          } else {
            x.fillStyle = '#2b3238';
            x.fillRect(0, 0, w, h);
            for (let yy = 0; yy < h; yy += 64) {
              for (let xx = 0; xx < w; xx += 64) {
                x.fillStyle = (xx / 64 + yy / 64) % 2 ? '#30383f' : '#242b31';
                x.fillRect(xx + 2, yy + 2, 60, 60);
                x.strokeStyle = 'rgba(54,240,255,.08)';
                x.strokeRect(xx + 2, yy + 2, 60, 60);
              }
            }
          }
        },
        256,
        256
      ),
      4,
      4
    );
    const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.92 });
    material.userData.shared = true;
    return material;
  });
}

export function awningMaterial(business) {
  return cachedTexture(`awning-material-${business.id}`, () => {
    const style = business.exterior.style;
    const base = `#${business.awning.toString(16).padStart(6, '0')}`;
    const accent = `#${business.trim.toString(16).padStart(6, '0')}`;
    const texture = makeCanvas(
      (x, w, h) => {
        x.fillStyle = base;
        x.fillRect(0, 0, w, h);
        if (style === 'electronics') {
          x.fillStyle = '#36f0ff';
          x.fillRect(0, h - 5, w, 3);
          x.fillStyle = 'rgba(54,240,255,.15)';
          for (let i = 0; i < w; i += 32) x.fillRect(i, 0, 2, h);
          return;
        }
        x.fillStyle = accent;
        const stripe = style === 'clothing' ? 18 : 40;
        for (let i = 0; i < w; i += stripe * 2) x.fillRect(i, 0, stripe, h);
        x.fillStyle = 'rgba(0,0,0,.08)';
        x.fillRect(0, h - 6, w, 6);
      },
      256,
      64
    );
    repeat(texture, 3, 1);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      color: 0xffffff,
      roughness: 0.85,
      side: THREE.DoubleSide
    });
    material.userData.shared = true;
    return material;
  });
}

// ---------------------------------------------------------------------------
// Sign artwork
// ---------------------------------------------------------------------------

function drawIcon(ctx, style, cx, cy, size, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(4, size * 0.075);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const s = size / 100;
  if (style === 'bakery') {
    ctx.beginPath();
    ctx.ellipse(0, 4 * s, 42 * s, 27 * s, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.3)';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 17 * s - 7 * s, -14 * s);
      ctx.quadraticCurveTo(i * 17 * s, -2 * s, i * 17 * s - 7 * s, 12 * s);
      ctx.stroke();
    }
  } else if (style === 'cafe') {
    ctx.beginPath();
    ctx.moveTo(-26 * s, -16 * s);
    ctx.lineTo(-26 * s, 8 * s);
    ctx.quadraticCurveTo(-26 * s, 26 * s, -4 * s, 26 * s);
    ctx.lineTo(12 * s, 26 * s);
    ctx.quadraticCurveTo(28 * s, 26 * s, 28 * s, 8 * s);
    ctx.lineTo(28 * s, -16 * s);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(37 * s, 1 * s, 10 * s, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.lineWidth = 5 * s;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo((i * 16 - 4) * s, -24 * s);
      ctx.quadraticCurveTo((i * 16 + 4) * s, -34 * s, (i * 16 - 4) * s, -42 * s);
      ctx.stroke();
    }
    ctx.fillRect(-40 * s, 32 * s, 80 * s, 6 * s);
  } else if (style === 'pharmacy') {
    ctx.fillRect(-14 * s, -44 * s, 28 * s, 88 * s);
    ctx.fillRect(-44 * s, -14 * s, 88 * s, 28 * s);
  } else if (style === 'clothing') {
    ctx.beginPath();
    ctx.arc(0, -32 * s, 11 * s, -Math.PI / 2, Math.PI * 1.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-38 * s, 30 * s);
    ctx.lineTo(0, -10 * s);
    ctx.lineTo(38 * s, 30 * s);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-38 * s, 30 * s);
    ctx.lineTo(38 * s, 30 * s);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(4 * s, -46 * s);
    ctx.lineTo(-26 * s, 8 * s);
    ctx.lineTo(-3 * s, 8 * s);
    ctx.lineTo(-12 * s, 46 * s);
    ctx.lineTo(30 * s, -12 * s);
    ctx.lineTo(6 * s, -12 * s);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function splitSignName(business) {
  const words = business.name.toUpperCase().split(' ');
  if (business.name.length <= 13 || words.length < 2) return [business.name.toUpperCase()];
  if (words.length === 3) return [[words[0], words[1]].join(' '), words[2]];
  const middle = Math.ceil(words.length / 2);
  return [words.slice(0, middle).join(' '), words.slice(middle).join(' ')];
}

function fitText(ctx, text, maxWidth, startSize, weight = 'bold', family = 'Georgia, serif') {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && size > 22) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

export function shopSignTexture(business) {
  return cachedTexture(`sign-${business.id}`, () => {
    const lines = splitSignName(business);
    return makeCanvas(
      (x, w, h) => {
        const gradient = x.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, business.signColor);
        gradient.addColorStop(1, business.signColor);
        x.fillStyle = gradient;
        x.fillRect(0, 0, w, h);
        x.strokeStyle = `#${business.trim.toString(16).padStart(6, '0')}`;
        x.lineWidth = 8;
        x.strokeRect(12, 12, w - 24, h - 24);
        x.fillStyle = 'rgba(255,255,255,.06)';
        x.fillRect(18, 18, w - 36, 30);
        drawIcon(
          x,
          business.exterior.style,
          135,
          h / 2,
          92,
          `#${business.trim.toString(16).padStart(6, '0')}`
        );
        x.fillStyle = business.signText;
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        const maxWidth = w - 300;
        if (lines.length === 1) {
          const size = fitText(x, lines[0], maxWidth, 90);
          x.font = `bold ${size}px Georgia, serif`;
          x.fillText(lines[0], 575, h / 2 + 2);
        } else {
          const size = fitText(x, lines[0], maxWidth, 68);
          x.font = `bold ${size}px Georgia, serif`;
          x.fillText(lines[0], 575, 92);
          x.font = `bold ${Math.max(34, size - 4)}px Georgia, serif`;
          x.fillText(lines[1], 575, 180);
        }
        x.font = '18px Arial';
        x.fillStyle = 'rgba(255,255,255,.65)';
        x.fillText(business.tagline.slice(0, 62), 575, h - 34);
      },
      1024,
      256
    );
  });
}

export function bladeSignTexture(business) {
  return cachedTexture(`blade-${business.id}`, () => {
    const label = business.shortName;
    return makeCanvas(
      (x, w, h) => {
        x.fillStyle = business.signColor;
        x.fillRect(0, 0, w, h);
        x.strokeStyle = `#${business.trim.toString(16).padStart(6, '0')}`;
        x.lineWidth = 8;
        x.strokeRect(10, 10, w - 20, h - 20);
        drawIcon(
          x,
          business.exterior.style,
          w / 2,
          110,
          100,
          `#${business.trim.toString(16).padStart(6, '0')}`
        );
        x.fillStyle = business.signText;
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        const size = fitText(x, label, w - 48, 52, 'bold', 'Arial');
        x.font = `bold ${size}px Arial`;
        x.fillText(label, w / 2, h - 96);
        x.font = '20px Arial';
        x.fillStyle = 'rgba(255,255,255,.6)';
        x.fillText(business.staff.name.toUpperCase(), w / 2, h - 48);
      },
      256,
      512
    );
  });
}

export function menuBoardTexture(business, title) {
  return cachedTexture(`menu-${business.id}-${title}`, () =>
    makeCanvas(
      (x, w, h) => {
        x.fillStyle = business.accent;
        x.fillRect(0, 0, w, h);
        x.strokeStyle = `#${business.trim.toString(16).padStart(6, '0')}`;
        x.lineWidth = 8;
        x.strokeRect(12, 12, w - 24, h - 24);
        x.fillStyle = business.signText;
        x.textAlign = 'center';
        x.font = 'bold 30px Georgia, serif';
        x.fillText(title.toUpperCase(), w / 2, 52);
        x.strokeStyle = 'rgba(255,255,255,.35)';
        x.lineWidth = 2;
        x.beginPath();
        x.moveTo(40, 70);
        x.lineTo(w - 40, 70);
        x.stroke();
        x.font = '20px Arial';
        x.fillStyle = 'rgba(255,255,255,.78)';
        x.fillText('ASK AT THE COUNTER', w / 2, h - 38);
        x.textAlign = 'left';
        x.fillStyle = 'rgba(255,255,255,.55)';
        x.font = '17px Arial';
        const items = (business.offers || []).slice(0, 4);
        items.forEach((offer, i) => {
          x.fillText(`• ${offer.label}`, 42, 112 + i * 34);
        });
      },
      512,
      320
    )
  );
}

export function welcomeMatTexture(business) {
  return cachedTexture(`mat-${business.id}`, () =>
    makeCanvas(
      (x, w, h) => {
        x.fillStyle = business.accent;
        x.fillRect(0, 0, w, h);
        x.strokeStyle = `#${business.trim.toString(16).padStart(6, '0')}`;
        x.lineWidth = 10;
        x.strokeRect(14, 14, w - 28, h - 28);
        x.fillStyle = business.signText;
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.font = 'bold 46px Arial';
        x.fillText('WELCOME', w / 2, h / 2 - 18);
        x.font = '26px Georgia, serif';
        x.fillText(business.shortName, w / 2, h / 2 + 38);
      },
      512,
      256
    )
  );
}

export function productShelfTexture(business, label) {
  return cachedTexture(`shelf-${business.id}-${label}`, () =>
    makeCanvas(
      (x, w, h) => {
        x.fillStyle = '#f6efdd';
        x.fillRect(0, 0, w, h);
        x.fillStyle = business.accent;
        x.fillRect(0, 0, w, 16);
        x.fillStyle = '#2a2a25';
        x.textAlign = 'center';
        x.font = 'bold 24px Arial';
        x.fillText(label.toUpperCase(), w / 2, h / 2 + 8);
        x.strokeStyle = business.color.toString(16).padStart(6, '0');
        x.strokeStyle = `#${business.color.toString(16).padStart(6, '0')}`;
        x.lineWidth = 3;
        x.strokeRect(3, 3, w - 6, h - 6);
      },
      256,
      96
    )
  );
}

export function screenTexture(seed = 0) {
  return cachedTexture(`screen-${seed}`, () =>
    makeCanvas(
      (x, w, h) => {
        x.fillStyle = '#0b1014';
        x.fillRect(0, 0, w, h);
        const bars = ['#e84c4c', '#e8a83a', '#e8e04a', '#4adf6b', '#3a9ce8', '#b04ae8'];
        bars.forEach((color, i) => {
          x.fillStyle = color;
          x.fillRect(20 + i * ((w - 40) / bars.length), 22, (w - 50) / bars.length, h * 0.42);
        });
        x.fillStyle = 'rgba(54,240,255,.18)';
        for (let y = h * 0.66; y < h - 24; y += 8) x.fillRect(22, y, w - 44, 3);
        x.fillStyle = '#d7fbff';
        x.font = 'bold 20px Arial';
        x.fillText(seed % 2 ? 'VOLT / 4K' : 'SIGNAL OK', 22, h - 18);
      },
      256,
      144
    )
  );
}
