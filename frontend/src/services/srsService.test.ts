// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { srsService } from './srsService';

describe('srsService Logic Guard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('correctly tracks daily review completion state for today', () => {
    expect(srsService.isDailyReviewCompletedToday('test_user')).toBe(false);
    srsService.markDailyReviewCompletedToday('test_user');
    expect(srsService.isDailyReviewCompletedToday('test_user')).toBe(true);
  });

  it('calculates initial interval of 1 on first correct item review', () => {
    srsService.processItemReview('test_user', 'item_1', 'grammar_1', ['tenses'], { isCorrect: true });
    const raw = JSON.parse(localStorage.getItem('toeic_srs_items_') || '{}');
    expect(raw['item_1'].reps).toBe(1);
    expect(raw['item_1'].interval).toBe(1);
  });

  it('multiplies interval by ease factor on subsequent correct item reviews', () => {
    srsService.processItemReview('test_user', 'item_2', 'grammar_1', ['tenses'], { isCorrect: true });
    srsService.processItemReview('test_user', 'item_2', 'grammar_1', ['tenses'], { isCorrect: true });
    const raw = JSON.parse(localStorage.getItem('toeic_srs_items_') || '{}');
    expect(raw['item_2'].reps).toBe(2);
    expect(raw['item_2'].interval).toBe(3); // Math.round(1 * 2.5) = 3
  });

  it('resets interval and reps to 1 on failure', () => {
    srsService.processItemReview('test_user', 'item_3', 'grammar_1', ['tenses'], { isCorrect: true });
    srsService.processItemReview('test_user', 'item_3', 'grammar_1', ['tenses'], { isCorrect: true });
    srsService.processItemReview('test_user', 'item_3', 'grammar_1', ['tenses'], { isCorrect: false });
    const raw = JSON.parse(localStorage.getItem('toeic_srs_items_') || '{}');
    expect(raw['item_3'].reps).toBe(0);
    expect(raw['item_3'].interval).toBe(1);
  });
});
