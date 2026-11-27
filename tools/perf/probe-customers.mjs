// Measures the render cost of seven shoppers and checks cart-hand contact.
// Usage: node tools/perf/probe-customers.mjs [url]
import fs from 'node:fs';
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://127.0.0.1:5174/?e2e=1';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(url);
await page.waitForFunction(() => !!window.freshMart, null, { timeout: 60000 });

// Headless pointer lock stalls the real Start button. Enter play mode directly
// and hide the document so the game's RAF loop stops stealing frames.
await page.evaluate(() => {
  const g = window.freshMart;
  g.mode = 'playing';
  g.ui.hideAll();
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  const loading = document.querySelector('#loading');
  if (loading) loading.style.display = 'none';
});

const spawned = await page.evaluate(async () => {
  const g = window.freshMart;
  const { spawnCustomer } = await import('/src/entities/Customer.js');
  const t0 = performance.now();
  while (g.runtime.customers.length < 7 && performance.now() - t0 < 60000) {
    for (let i = 0; i < 7; i += 1) spawnCustomer(g);
    await new Promise((r) => setTimeout(r, 400));
  }
  return g.runtime.customers.length;
});
console.log('customers loaded:', spawned);

const result = await page.evaluate(async () => {
  const g = window.freshMart;
  const V = g.camera.position.constructor;
  const Q = g.camera.quaternion.constructor;
  const cs = g.runtime.customers;

  // Deterministic worst case: all seven shoppers in one frame, lit and shadowed.
  cs.forEach((c, i) => {
    c.group.position.set((i - 3) * 1.05, 0, 9.4);
    c.group.rotation.y = 0;
    c.group.visible = true;
    c.mixer?.stopAllAction();
    const idle = c.actions?.Idle;
    if (idle) idle.reset().setEffectiveWeight(1).play();
    c.mixer?.update(0.4);
    c.group.updateMatrixWorld(true);
  });
  g.camera.position.set(0, 1.75, 13.4);
  g.camera.lookAt(0, 1.0, 9.0);
  g.camera.updateMatrixWorld(true);

  const draw = () => {
    g.renderer.render(g.scene, g.camera);
    return { calls: g.renderer.info.render.calls, triangles: g.renderer.info.render.triangles };
  };
  const full = draw();
  const charStats = { meshes: 0, skinned: 0, materials: new Set() };
  for (const c of cs) {
    c.group.traverse((o) => {
      if (!o.isMesh) return;
      charStats.meshes += 1;
      if (o.isSkinnedMesh) charStats.skinned += 1;
      if (o.material) charStats.materials.add(o.material.uuid);
    });
  }
  charStats.materials = charStats.materials.size;

  cs.forEach((c) => (c.group.visible = false));
  const hidden = draw();
  cs.forEach((c) => (c.group.visible = true));

  // Animation cost for all seven mixers (idle clips).
  const t1 = performance.now();
  for (let i = 0; i < 120; i += 1) for (const c of cs) c.mixer?.update(1 / 60);
  const animMsPerFrame = +((performance.now() - t1) / 120).toFixed(2);

  const gripFor = (c, kind) => {
    c.mixer.stopAllAction();
    const clip = kind === 'cart' ? c.actions.IdleCart : c.actions.IdleBasket;
    if (!clip) return null;
    clip.reset().setEffectiveWeight(1).play();
    c.mixer.update(0.4);
    c.group.updateMatrixWorld(true);
    const H = c.character.height;
    const handLen = H * 0.095;
    const targetY = kind === 'cart' ? 1.05 : H * 0.5 + 0.21;
    const targetZ = kind === 'cart' ? 0.38 : 0.36;
    const targetX = 0.17;
    const rows = [];
    for (const side of ['L', 'R']) {
      const bone = c.group.getObjectByName('Hand_' + side);
      if (!bone) continue;
      const wrist = bone.getWorldPosition(new V());
      const q = bone.getWorldQuaternion(new Q());
      const palm = wrist.clone().add(new V(0, handLen * 0.5, 0).applyQuaternion(q));
      const localPalm = c.group.worldToLocal(palm.clone());
      const target = new V(side === 'L' ? targetX : -targetX, targetY, targetZ);
      rows.push({
        side,
        palm: localPalm.toArray().map((v) => +v.toFixed(3)),
        gap: +localPalm.distanceTo(target).toFixed(3)
      });
    }
    return { id: c.character.id, kind, rows };
  };
  const grips = cs
    .filter((c) => c.character.carry === 'cart' || c.character.carry === 'basket')
    .map((c) => gripFor(c, c.character.carry));

  return { full, hidden, charStats, animMsPerFrame, grips };
});

console.log(JSON.stringify(result, null, 2));
await browser.close();
