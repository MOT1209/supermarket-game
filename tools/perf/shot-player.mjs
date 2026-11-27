// Captures a player camera view against the live store.
// Usage: node tools/perf/shot-player.mjs [url] [out.png] [male|female] [first|second|third]
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://127.0.0.1:5174/?e2e=1';
const out = process.argv[3] || 'assets/characters/renders/player-first.png';
const kind = process.argv[4] || 'male';
const view = process.argv[5] || 'first';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.error('[console]', m.text());
});
await page.goto(url, { waitUntil: 'load', timeout: 90000 });
await page.waitForFunction(
  () => window.freshMart && document.querySelector('#loading')?.style.display === 'none',
  null,
  { timeout: 90000 }
);

const info = await page.evaluate(async ({ kind, view }) => {
  const g = window.freshMart;
  g.state.playerModel = kind;
  g.state.viewMode = view;
  g.player.setPlayerModel(kind);
  g.player.setView(view);
  g.setMode('playing');
  g.ui.hideAll();
  const hud = document.querySelector('#hud');
  if (hud) hud.style.display = 'none';
  // Stop the game loop from overwriting the frozen frame we are about to draw.
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });

  const waitFor = async (check, ms = 15000) => {
    const t0 = performance.now();
    while (!check() && performance.now() - t0 < ms) {
      await new Promise((r) => setTimeout(r, 100));
    }
  };
  await waitFor(() => g.player.viewModel && g.player.viewKind === kind);
  if (view !== 'first') {
    await waitFor(() => g.player.body && g.player.bodyKind === kind);
    g.player.bodyMixer?.update(0.5);
    g.player.syncBody(0, false, false);
  }
  g.player.updateCamera(1.7);
  g.renderer.render(g.scene, g.camera);
  return {
    model: !!g.player.viewModel,
    body: !!g.player.body,
    kind: g.player.viewKind,
    view: g.player.view
  };
}, { kind, view });

await page.waitForTimeout(250);
await page.screenshot({ path: out });
await browser.close();
console.log(JSON.stringify({ out, ...info }));
