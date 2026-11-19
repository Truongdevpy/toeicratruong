import { test, expect } from '../fixtures/auditFixture';

test.describe('Practice Listening & Reading @listening @reading', () => {
  test('Listening Practice Page structure @listening', async ({ auditPage }) => {
    await auditPage.goto('/practice/listening');
    await auditPage.waitForTimeout(1000);

    // Ensure listening view container
    const mainTitle = auditPage.locator('h1, h2, [data-testid="listening-practice"]');
    await expect(mainTitle.first()).toBeVisible();
  });

  test('Reading Practice Page structure @reading', async ({ auditPage }) => {
    await auditPage.goto('/practice/reading');
    await auditPage.waitForTimeout(1000);

    const mainTitle = auditPage.locator('h1, h2, [data-testid="reading-practice"]');
    await expect(mainTitle.first()).toBeVisible();
  });
});
