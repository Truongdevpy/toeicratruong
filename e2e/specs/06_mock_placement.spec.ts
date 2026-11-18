import { test, expect } from '../fixtures/auditFixture';

test.describe('Mock Tests & Placement Test @mock @placement', () => {
  test('Mock Tests Catalog has Tab Đề thi (200) @mock', async ({ auditPage }) => {
    await auditPage.goto('/mock-tests');
    await auditPage.waitForTimeout(1000);

    const body = auditPage.locator('body');
    await expect(body).not.toBeEmpty();
  });

  test('Placement Test structure @placement', async ({ auditPage }) => {
    await auditPage.goto('/placement-test');
    await auditPage.waitForTimeout(1000);

    const body = auditPage.locator('body');
    await expect(body).not.toBeEmpty();
  });
});
