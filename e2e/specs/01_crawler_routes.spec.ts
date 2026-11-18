import { test, expect } from '../fixtures/auditFixture';

test.describe('Crawler & Universal Route Auditing @nav', () => {
  const routesToTest = [
    '/',
    '/practice',
    '/practice/vocabulary',
    '/practice/grammar',
    '/practice/listening',
    '/practice/reading',
    '/practice/dictation',
    '/practice/speaking',
    '/practice/writing',
    '/practice/flashcards',
    '/games',
    '/leaderboard',
    '/community',
    '/mock-tests',
    '/dashboard',
    '/statistics',
    '/learning-path',
    '/ai-tutor',
    '/placement-test',
    '/achievements',
    '/payment'
  ];

  for (const route of routesToTest) {
    test(`Check route: ${route}`, async ({ auditPage }) => {
      await auditPage.goto(route, { waitUntil: 'domcontentloaded' });
      await auditPage.waitForTimeout(1000);

      // Verify no blank screen
      const body = auditPage.locator('body');
      await expect(body).not.toBeEmpty();

      // Check footer constraint: Footer only on home page '/'
      const footer = auditPage.locator('footer');
      if (route !== '/') {
        await expect(footer).toHaveCount(0);
      }
    });
  }
});
