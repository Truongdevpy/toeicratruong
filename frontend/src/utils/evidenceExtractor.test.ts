import { describe, it, expect } from 'vitest';
import { extractEvidenceFromQuestion, highlightPassageWithEvidence } from './evidenceExtractor';

describe('evidenceExtractor Logic Guard (TEST-12)', () => {
  const samplePassage = 'The annual conference will begin at 9:00 A.M. on Monday. All attendees must register at the reception desk to collect their badges. Parking is free for all registered guests.';

  it('extracts direct evidence when question contains matching quote', () => {
    const question: any = {
      id: 'q147',
      question_number: 147,
      options: { A: '1', B: '2', C: '3', D: '4' },
      correct_answer: 'A',
      explanation: 'Dẫn chứng: "All attendees must register at the reception desk"',
      evidence: 'All attendees must register at the reception desk',
      evidence_vi: 'Tất cả người tham dự phải đăng ký tại bàn lễ tân'
    };

    const ev = extractEvidenceFromQuestion(question, samplePassage);
    expect(ev).not.toBeNull();
    expect(ev?.text).toContain('reception desk');
    expect(ev?.translation).toContain('bàn lễ tân');
  });

  it('highlights passage with evidence span and anchor attributes', () => {
    const evidenceList = [
      {
        qNum: 147,
        text: 'All attendees must register at the reception desk',
        translation: 'Đăng ký tại bàn lễ tân'
      }
    ];

    const highlighted = highlightPassageWithEvidence(samplePassage, evidenceList);
    expect(highlighted).toContain('id="evidence-clue-147"');
    expect(highlighted).toContain('data-evidence-q="147"');
    expect(highlighted).toContain('mark');
  });

  it('safely handles passage with unescaped literal \\n newlines without throwing', () => {
    const rawPassage = 'First paragraph\\n\\nSecond paragraph with clue.';
    const evList = [{ qNum: 1, text: 'Second paragraph with clue' }];
    const res = highlightPassageWithEvidence(rawPassage, evList);
    expect(res).toBeTruthy();
    expect(res).not.toContain('\\n\\n');
  });
});
