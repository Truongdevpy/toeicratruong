// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { grammarProgressService, GrammarLessonNode } from './grammarProgressService';

describe('grammarProgressService Checkpoint Guard (TEST-09, GRA-01, GAMI-01)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and clears node checkpoint correctly', () => {
    grammarProgressService.saveNodeCheckpoint('user_test', 'node_1', {
      mode: 'exercise',
      questionIndex: 3,
      correctCount: 2,
      totalAttempts: 3,
      updatedAt: new Date().toISOString()
    });

    const progress = grammarProgressService.getProgress('user_test');
    expect(progress.nodes['node_1']?.checkpoint).toBeDefined();
    expect(progress.nodes['node_1']?.checkpoint?.questionIndex).toBe(3);

    grammarProgressService.clearNodeCheckpoint('user_test', 'node_1');
    const updated = grammarProgressService.getProgress('user_test');
    expect(updated.nodes['node_1']?.checkpoint).toBeUndefined();
  });

  it('completes node and increments total XP', () => {
    const dummyNode: GrammarLessonNode = {
      id: 'node_intro',
      topicId: 'tenses',
      unitIndex: 1,
      nodeIndex: 0,
      type: 'theory',
      title: 'Present Simple',
      subtitle: 'Basic',
      questionCount: 5,
      xpReward: 25
    };

    grammarProgressService.completeNode('user_test', dummyNode, 95, []);
    const progress = grammarProgressService.getProgress('user_test');
    expect(progress.nodes['node_intro']?.status).toBe('completed');
    expect(progress.nodes['node_intro']?.scorePercent).toBe(95);
    expect(progress.totalXp).toBe(25);
  });

  it('deducts hearts for normal users but preserves unlimited for VIP', () => {
    const normalHearts = grammarProgressService.consumeHeart('user_normal', false);
    expect(normalHearts).toBe(9); // Initial 10 - 1

    const vipHearts = grammarProgressService.consumeHeart('user_vip', true);
    expect(vipHearts).toBe(999); // VIP indicator in service
  });
});
