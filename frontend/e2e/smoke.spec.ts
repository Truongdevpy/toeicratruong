import { test, expect } from '@playwright/test';

test.describe('E2E Smoke Suite & Route Sanity (SYS-01, DATA-01)', () => {
  const routes = [
    { path: '/', titleCheck: /TOEIC/i },
    { path: '/practice', titleCheck: /Luyện/i },
    { path: '/games', titleCheck: /Trò chơi|Đấu trường/i },
    { path: '/practice/dictation', titleCheck: /Chính tả|Nghe chép/i },
    { path: '/leaderboard', titleCheck: /Bảng Xếp Hạng/i },
    { path: '/community', titleCheck: /Cộng đồng/i },
    { path: '/practice/listening', titleCheck: /Nghe/i },
    { path: '/practice/reading', titleCheck: /Đọc/i },
    { path: '/practice/writing', titleCheck: /Viết/i },
    { path: '/practice/speaking', titleCheck: /Nói/i },
    { path: '/practice/vocabulary', titleCheck: /Từ vựng/i },
    { path: '/practice/flashcards', titleCheck: /Flashcard/i },
    { path: '/practice/grammar', titleCheck: /Ngữ pháp/i },
  ];

  for (const r of routes) {
    test(`Route ${r.path} renders cleanly without white screen`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto(r.path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('body')).not.toBeEmpty();
      
      // Filter out external network failures in mock environments
      const criticalErrors = consoleErrors.filter(e => !e.includes('Failed to load resource') && !e.includes('favicon'));
      expect(criticalErrors.length).toBe(0);
    });
  }

  test('DATA-01: Deep link preserves route and handles back/forward', async ({ page }) => {
    await page.goto('/games');
    await expect(page).toHaveURL(/.*\/games/);

    await page.goto('/leaderboard');
    await expect(page).toHaveURL(/.*\/leaderboard/);

    await page.goBack();
    await expect(page).toHaveURL(/.*\/games/);

    await page.goForward();
    await expect(page).toHaveURL(/.*\/leaderboard/);
  });
});
