import { test, expect } from '@playwright/test';

test('Capture Practice Vocabulary Winding Path', async ({ page }) => {
  await page.goto('http://localhost:5173/practice/vocabulary', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '../e2e-audit/screens/vocabulary_winding_path.png', fullPage: true });
});

test('Capture Practice Grammar Duolingo Path', async ({ page }) => {
  await page.goto('http://localhost:5173/practice/grammar', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '../e2e-audit/screens/grammar_duolingo_path.png', fullPage: true });
});

test('Capture Arena Games Grid without Featured Banner', async ({ page }) => {
  await page.goto('http://localhost:5173/games', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '../e2e-audit/screens/games_arena_clean.png', fullPage: true });
});

test('Capture Leaderboard Clean Realtime Data', async ({ page }) => {
  await page.goto('http://localhost:5173/leaderboard', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '../e2e-audit/screens/leaderboard_clean.png', fullPage: true });
});

test('Capture Speaking Shadowing Practice Page', async ({ page }) => {
  await page.goto('http://localhost:5173/practice/speaking', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '../e2e-audit/screens/speaking_practice.png', fullPage: true });
});
