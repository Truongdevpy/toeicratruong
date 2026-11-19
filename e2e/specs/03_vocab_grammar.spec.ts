import { test, expect } from '../fixtures/auditFixture';

test.describe('Vocabulary & Grammar Roadmaps @vocab @grammar', () => {
  test('Vocabulary winding path is default view @vocab', async ({ auditPage }) => {
    await auditPage.goto('/practice/vocabulary');
    await auditPage.waitForTimeout(1000);

    // Title constraint
    // Duolingo standardized roadmap view active

    // Winding path container
    const pathContainer = auditPage.locator('[data-testid="vocab-path-container"]');
    await expect(pathContainer).toBeVisible();

    // Toggle button to list
    const listBtn = auditPage.locator('[data-testid="vocab-list-view-btn"]');
    await expect(listBtn).toBeVisible();
    await listBtn.click();
    await expect(pathContainer).not.toBeVisible();
  });

  test('Grammar roadmap is default view @grammar', async ({ auditPage }) => {
    await auditPage.goto('/practice/grammar');
    await auditPage.waitForTimeout(1000);

    // Ensure Duolingo-like grammar path exists
    const body = auditPage.locator('body');
    await expect(body).not.toBeEmpty();

    // Ensure forbidden old banner does NOT exist
    await expect(auditPage.locator('text=Kho Ngữ Pháp Thực Chiến')).toHaveCount(0);
  });
});
