import { test, expect } from '../fixtures/auditFixture';

test.describe('Dictation, Speaking & Writing @dictation @speaking @writing', () => {
  test('Dictation Practice Page structure @dictation', async ({ auditPage }) => {
    await auditPage.goto('/practice/dictation');
    await auditPage.waitForTimeout(1000);

    const body = auditPage.locator('body');
    await expect(body).not.toBeEmpty();
  });

  test('Speaking Practice Page structure @speaking', async ({ auditPage }) => {
    await auditPage.goto('/practice/speaking');
    await auditPage.waitForTimeout(1000);

    const body = auditPage.locator('body');
    await expect(body).not.toBeEmpty();
  });

  test('Writing Practice Page structure @writing', async ({ auditPage }) => {
    await auditPage.goto('/practice/writing');
    await auditPage.waitForTimeout(1000);

    // Rule: no 'Band 200' and no '10-25 từ' in questions
    await expect(auditPage.locator('text=Band 200')).toHaveCount(0);
  });
});
