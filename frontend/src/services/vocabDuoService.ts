// Service managing local vocabulary XP
class VocabDuoService {
  private getKey(userId?: string | number): string {
    return 'toeic_vocab_xp_' + (userId || 'guest');
  }

  public getTotalXp(userId?: string | number): number {
    try {
      const raw = localStorage.getItem(this.getKey(userId));
      if (raw) {
        const val = parseInt(raw, 10);
        return isNaN(val) ? 0 : val;
      }
    } catch {
      // ignore
    }
    return 0;
  }

  public addXp(userId: string | number | undefined, amount: number): number {
    const current = this.getTotalXp(userId);
    const updated = current + amount;
    try {
      localStorage.setItem(this.getKey(userId), String(updated));
    } catch {
      // ignore
    }
    return updated;
  }
}

export const vocabDuoService = new VocabDuoService();
