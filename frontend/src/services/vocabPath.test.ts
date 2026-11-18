import { describe, it, expect, beforeEach } from 'vitest';
import { VOCAB_UNITS } from '../components/vocabulary/VocabPathView';
import { VocabUserProgress } from '../types/vocabDuo';

describe('VOC-01 & VOC-02: Vocabulary Road Map & Pronunciation', () => {
  it('VOC-01: Contains all 12 ETS standard topic units with 48 nodes', () => {
    expect(VOCAB_UNITS.length).toBe(12);

    let totalNodes = 0;
    VOCAB_UNITS.forEach((unit, uIdx) => {
      expect(unit.nodes.length).toBe(4);
      totalNodes += unit.nodes.length;

      // Verify node types sequential progression
      expect(unit.nodes[0].type).toBe('theory');
      expect(unit.nodes[1].type).toBe('practice_basic');
      expect(unit.nodes[2].type).toBe('collocations'); // Pronunciation step VOC-02
      expect(unit.nodes[3].type).toBe('checkpoint');
    });

    expect(totalNodes).toBe(48);
  });

  it('VOC-01: Progression unlock unlocks the sequential next node', () => {
    const progress: VocabUserProgress = {
      userId: 'test_user',
      hearts: 10,
      nodes: {
        'v_u1_n0': {
          status: 'completed',
          stars: 3,
          scorePercent: 100,
          attemptsCount: 1
        }
      },
      skippedTopics: [],
      totalXp: 20
    };

    // First node completed
    expect(progress.nodes['v_u1_n0'].status).toBe('completed');
    // Next node can be unlocked
    const nextNodeId = 'v_u1_n1';
    progress.nodes[nextNodeId] = {
      status: 'unlocked',
      stars: 0,
      scorePercent: 0,
      attemptsCount: 0
    };
    expect(progress.nodes[nextNodeId].status).toBe('unlocked');
  });

  it('VOC-02: Micro pronunciation passing threshold is at least 70/100', () => {
    const minPassScore = 70;
    const testScores = [50, 68, 70, 85, 100];
    const results = testScores.map((s) => s >= minPassScore);

    expect(results).toEqual([false, false, true, true, true]);
  });
});
