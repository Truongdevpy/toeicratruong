// Spaced Repetition Service for TOEIC learning
class SRSService {
  private getReviewKey(userId?: string | number): string {
    return 'toeic_daily_review_date_' + (userId || 'guest');
  }

  public isDailyReviewCompletedToday(userId?: string | number): boolean {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const saved = localStorage.getItem(this.getReviewKey(userId));
      return saved === today;
    } catch {
      return false;
    }
  }

  public markDailyReviewCompletedToday(userId?: string | number): void {
    try {
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem(this.getReviewKey(userId), today);
    } catch {
      // ignore
    }
  }

  public processItemReview(
    userId: string | number | undefined,
    itemId: string,
    topicId: string,
    tags: string[],
    result: { isCorrect: boolean; responseTimeMs?: number }
  ): void {
    // Record review attempt in local storage for SRS tracking
    try {
      const key = 	'toeic_srs_items_';
      const raw = localStorage.getItem(key);
      const data = raw ? JSON.parse(raw) : {};
      const current = data[itemId] || {
        reps: 0,
        interval: 1,
        ease: 2.5,
        lastReviewed: null
      };

      if (result.isCorrect) {
        current.reps += 1;
        current.interval = current.reps === 1 ? 1 : Math.round(current.interval * current.ease);
      } else {
        current.reps = 0;
        current.interval = 1;
      }
      current.lastReviewed = new Date().toISOString();
      data[itemId] = current;
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // ignore
    }
  }
}

export const srsService = new SRSService();
