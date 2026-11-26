import { test, expect } from '@playwright/test';

async function startGame(page) {
  // Headless software WebGL is very slow. Simulate a hidden tab so the game
  // skips its render loop while DOM/state interactions stay testable.
  await page.addInitScript(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  });
  await page.goto('/?e2e=1');
  await page.locator('#startBtn').click();
  await expect(page.locator('#startOverlay')).toBeHidden();
  await expect(page.locator('#loading')).toBeHidden();
}

test('boots into the game without a fatal graphics error', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await startGame(page);

  await expect(page.locator('#fatalOverlay')).toBeHidden();
  await expect(page.locator('#hud')).toBeVisible();
  await expect(page.locator('#cashText')).toBeVisible();
  expect(errors).toEqual([]);
});

test('terminal renders stock, analytics and achievements tabs', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.freshMart.ui.openTerminal());

  await expect(page.locator('#terminalOverlay')).toBeVisible();
  await expect(page.locator('#tabContent')).toContainText('Wholesale boxes');

  await page.locator('[data-tab="analytics"]').click();
  await expect(page.locator('#tabContent')).toContainText('Store Analytics');

  await page.locator('[data-tab="achievements"]').click();
  await expect(page.locator('#tabContent')).toContainText('Achievements');
  await expect(page.locator('#tabContent')).toContainText('unlocked');

  await page.locator('#termClose').click();
  await expect(page.locator('#terminalOverlay')).toBeHidden();
});

test('ordering a box spends cash and spawns a delivery', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.freshMart.ui.openTerminal());

  const before = await page.evaluate(() => ({
    cash: window.freshMart.state.cash,
    boxes: window.freshMart.runtime.boxes.length
  }));
  await page.locator('#tabContent [data-buy]').first().click();
  const after = await page.evaluate(() => ({
    cash: window.freshMart.state.cash,
    boxes: window.freshMart.runtime.boxes.length
  }));

  expect(after.cash).toBeLessThan(before.cash);
  expect(after.boxes).toBeGreaterThan(before.boxes);
});

test('closing the day shows the report and advances to the next day', async ({ page }) => {
  await startGame(page);
  const day = await page.evaluate(() => window.freshMart.state.day);

  await page.evaluate(() => window.freshMart.closeStore());
  await expect(page.locator('#summaryOverlay')).toBeVisible();
  await expect(page.locator('#summaryBody')).toContainText('Total Revenue');

  await page.locator('#nextDayBtn').click();
  await expect(page.locator('#summaryOverlay')).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.freshMart.state.day)).toBe(day + 1);
});
