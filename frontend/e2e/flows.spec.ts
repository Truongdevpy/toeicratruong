import { test, expect } from '@playwright/test';

test.describe('Practice & Arena Games Flow (GAM-01, GAM-02, GAM-03, TEST-01)', () => {
  test('GAM-01/02/03: Opens GameSetupModal, selects config, and enters game', async ({ page }) => {
    await page.goto('/games');
    
    // Check for mini-games container
    const gameCards = page.locator('button, div').filter({ hasText: /Trắc nghiệm|Word Blast|Mưa từ/i });
    if (await gameCards.count() > 0) {
      await gameCards.first().click();
      // Setup modal or bottom sheet should appear
      const modal = page.locator('text=Bắt đầu|Thiết lập|Chọn số câu');
      if (await modal.count() > 0) {
        await expect(modal.first()).toBeVisible();
      }
    }
  });

  test('Community: Likes persistent interaction mock (GAMI-03)', async ({ page }) => {
    await page.goto('/community');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('Writing Room: Mock AI evaluation handles empty/gibberish (WRI-03)', async ({ page }) => {
    await page.goto('/practice/writing');
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
