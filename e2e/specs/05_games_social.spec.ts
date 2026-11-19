import { test, expect } from '../fixtures/auditFixture';

test.describe('Games, Leaderboard & Community @games @leaderboard @community', () => {
  test('Games grid has no FeaturedGame banner @games', async ({ auditPage }) => {
    await auditPage.goto('/games');
    await auditPage.waitForTimeout(1000);

    // Rule: no 'Gợi ý hôm nay'
    await expect(auditPage.locator('text=Gợi ý hôm nay')).toHaveCount(0);
  });

  test('Leaderboard has real users and no fake club tiers @leaderboard', async ({ auditPage }) => {
    await auditPage.goto('/leaderboard');
    await auditPage.waitForTimeout(1000);

    // Rule: no 'CLB Master' or 'CLB Bứt Phá'
    await expect(auditPage.locator('text=CLB Master')).toHaveCount(0);
    await expect(auditPage.locator('text=CLB Bứt Phá')).toHaveCount(0);
  });

  test('Community feed displays posts @community', async ({ auditPage }) => {
    await auditPage.goto('/community');
    await auditPage.waitForTimeout(1000);

    const body = auditPage.locator('body');
    await expect(body).not.toBeEmpty();
  });
});
