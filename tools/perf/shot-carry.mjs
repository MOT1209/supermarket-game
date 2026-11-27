// Renders both shoppers of one carry style with their props and saves the frame.
// Usage: node tools/perf/shot-carry.mjs [url] [cart|basket] [outfile]
import fs from 'node:fs';
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://127.0.0.1:5174/?e2e=1';
const kind = process.argv[3] === 'basket' ? 'basket' : 'cart';
const out = process.argv[4] || `assets/characters/renders/${kind}-grip.png`;
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await browser.newPage({ viewport: { width: 1200, height: 720 } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(url);
await page.waitForFunction(() => !!window.freshMart, null, { timeout: 60000 });

const data = await page.evaluate(async (carry) => {
  const g = window.freshMart;
  g.mode = 'paused';
  g.ui.hideAll();
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  const { cloneCharacter } = await import('/src/utils/AssetLoader.js');
  const { makeCarryProp } = await import('/src/entities/CustomerProps.js');
  const { CUSTOMER_CHARACTERS } = await import('/src/data/customers.js');
  const { AnimationMixer } = await import('/node_modules/three/build/three.module.js');
  const V = g.camera.position.constructor;
  const Q = g.camera.quaternion.constructor;

  g.runtime.customers.forEach((c) => (c.group.visible = false));
  const characters = CUSTOMER_CHARACTERS.filter((c) => c.carry === carry);
  const info = [];
  for (let i = 0; i < characters.length; i += 1) {
    const character = characters[i];
    const model = await cloneCharacter(character.file);
    model.position.set((i - 0.5) * 1.55, 0, 5.4);
    model.rotation.y = 0;
    g.scene.add(model);
    const prop = makeCarryProp(carry, character.height);
    model.add(prop);
    const mixer = new AnimationMixer(model);
    const clip = model.userData.animations.find(
      (a) => a.name === (carry === 'cart' ? 'IdleCart' : 'IdleBasket')
    );
    if (clip) mixer.clipAction(clip).reset().setEffectiveWeight(1).play();
    mixer.update(0.6);
    model.updateMatrixWorld(true);
    const handLen = character.height * 0.095;
    const targetY = carry === 'cart' ? 1.05 : character.height * 0.5 + 0.21;
    const targetZ = carry === 'cart' ? 0.38 : 0.36;
    const hands = [];
    for (const side of ['L', 'R']) {
      const bone = model.getObjectByName('Hand_' + side);
      const wrist = bone.getWorldPosition(new V());
      const q = bone.getWorldQuaternion(new Q());
      const palm = wrist.clone().add(new V(0, handLen * 0.5, 0).applyQuaternion(q));
      const local = model.worldToLocal(palm.clone());
      const target = new V(side === 'L' ? 0.17 : -0.17, targetY, targetZ);
      hands.push({
        side,
        palm: local.toArray().map((v) => +v.toFixed(3)),
        gap: +local.distanceTo(target).toFixed(3)
      });
    }
    info.push({
      id: character.id,
      meshes: (() => {
        let n = 0;
        model.traverse((o) => (n += o.isMesh ? 1 : 0));
        return n;
      })(),
      propMeshes: prop.children.length,
      clips: model.userData.animations.length,
      hands
    });
  }

  g.camera.fov = 55;
  g.camera.updateProjectionMatrix();
  g.camera.position.set(0, 1.25, 7.5);
  g.camera.lookAt(0, 1.06, 5.6);
  g.camera.updateMatrixWorld(true);
  g.renderer.render(g.scene, g.camera);
  return {
    image: g.renderer.domElement.toDataURL('image/png'),
    info,
    calls: g.renderer.info.render.calls
  };
}, kind);

fs.mkdirSync(out.split('/').slice(0, -1).join('/'), { recursive: true });
fs.writeFileSync(out, Buffer.from(data.image.split(',')[1], 'base64'));
console.log(JSON.stringify({ out, kind, calls: data.calls, info: data.info }, null, 2));
await browser.close();
