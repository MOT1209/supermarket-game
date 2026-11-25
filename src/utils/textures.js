import * as THREE from 'three';

export function makeCanvas(draw, w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function floorTexture() {
  const t = makeCanvas((x, w, h) => {
    x.fillStyle = '#b9c2c9'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < w; i += 64) {
      for (let j = 0; j < h; j += 64) {
        x.fillStyle = ((i + j) / 64) % 2 ? '#aeb8c1' : '#c8d0d6';
        x.fillRect(i, j, 64, 64);
        x.strokeStyle = '#98a3ab'; x.strokeRect(i, j, 64, 64);
      }
    }
  }, 512, 512);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(8, 8);
  return t;
}

export function outsideTexture() {
  const t = makeCanvas((x, w, h) => {
    x.fillStyle = '#7d8a6b'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i++) {
      x.fillStyle = Math.random() > 0.5 ? '#869573' : '#6f7d60';
      x.fillRect(Math.random() * w, Math.random() * h, 3, 3);
    }
  }, 256, 256);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(10, 10);
  return t;
}

export function labelTexture(name, color) {
  return makeCanvas((x, w, h) => {
    x.fillStyle = '#' + color.toString(16).padStart(6, '0');
    x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(255,255,255,.92)';
    x.fillRect(0, h * 0.55, w, h * 0.45);
    x.fillStyle = '#111'; x.font = 'bold 34px Arial';
    x.textAlign = 'center'; x.fillText(name, w / 2, h * 0.82);
    x.fillStyle = 'rgba(255,255,255,.35)';
    x.fillRect(8, 8, w - 16, h * 0.32);
  }, 256, 128);
}

export function signTexture(name) {
  return makeCanvas((x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1c7a34'); g.addColorStop(1, '#0d4a20');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#ffe08a'; x.lineWidth = 8; x.strokeRect(10, 10, w - 20, h - 20);
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    let size = 92; x.font = `bold ${size}px Arial`;
    while (x.measureText(name).width > w - 60 && size > 30) {
      size -= 4; x.font = `bold ${size}px Arial`;
    }
    x.fillText(name, w / 2, h / 2 + 4);
  }, 1024, 256);
}

export function emojiTexture(emoji) {
  return makeCanvas(x => {
    x.font = '110px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(emoji, 64, 64);
  }, 128, 128);
}
