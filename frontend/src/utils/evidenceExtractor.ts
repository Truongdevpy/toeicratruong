import { Question } from '../types';

export interface EvidenceItem {
  qNum: number | string;
  text: string;
  translation?: string;
  paraphrase?: string;
  badgeClass?: string;
  markClass?: string;
}

const STOPWORDS = new Set([
  'what', 'when', 'where', 'which', 'who', 'whom', 'whose', 'why', 'how',
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'will', 'would',
  'could', 'should', 'does', 'did', 'are', 'was', 'were', 'been', 'have',
  'has', 'had', 'about', 'their', 'there', 'most', 'likely', 'refer',
  'following', 'according', 'statement', 'true', 'indicated', 'suggested',
  'mention', 'mentioned', 'purpose', 'into', 'over', 'than', 'them', 'these',
  'those', 'being', 'having', 'other', 'some', 'such', 'only', 'more'
]);

/**
 * Clean HTML tags and return plain text
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Split text into individual sentences
 */
export function splitSentences(text: string): string[] {
  if (!text) return [];
  const clean = stripHtml(text);
  // Split on period, exclamation, question mark followed by whitespace or line break
  return clean
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8);
}

/**
 * Extract evidence sentence and translation for a Question against the passage or transcript
 */
export function extractEvidenceFromQuestion(
  q: Question,
  fullPassageOrTranscript: string
): { text: string; translation?: string; paraphrase?: string } {
  const fullText = fullPassageOrTranscript || q.passage_text || q.transcript || '';
  const sentences = splitSentences(fullText);

  // 1. Direct explicit evidence field if provided in question object
  const anyQ = q as any;
  if (anyQ.evidence && typeof anyQ.evidence === 'string' && anyQ.evidence.trim().length > 5) {
    return {
      text: anyQ.evidence.trim(),
      translation: anyQ.evidence_vi || anyQ.evidence_translation || '',
      paraphrase: anyQ.paraphrase || ''
    };
  }

  // 2. Parse Explanation for explicit "Dẫn chứng:", "Script:", or quotes with translations
  const expl = q.explanation_vi || anyQ.explanation_en || q.explanation || '';
  if (expl) {
    // Pattern 1: Dẫn chứng / Script: "..." (Dịch: ...)
    const explRegex = /(?:dẫn chứng|script|câu trước|câu sau|đoạn \d+|dịch nghĩa)[^:"]*:\s*["“']([^"”']{8,})["”'](?:\s*\(([^)]+)\))?/i;
    const match = expl.match(explRegex);
    if (match) {
      const quote = match[1].trim();
      const trans = (match[2] || '').trim();

      // Find best corresponding sentence in the actual passage/transcript
      const mPara = expl.match(/Paraphrase:\s*([^\n\r]+)/i);
      const paraphrase = anyQ.paraphrase || (mPara ? mPara[1].trim() : undefined);
      if (sentences.length > 0) {
        for (const sent of sentences) {
          if (sent.toLowerCase().includes(quote.toLowerCase()) || quote.toLowerCase().includes(sent.toLowerCase())) {
            return { text: sent, translation: trans, paraphrase };
          }
        }
      }
      return { text: quote, translation: trans, paraphrase };
    }

    // Pattern 2: Any English quote in explanation of length >= 12 chars that exists in passage
    const quoteMatches = expl.match(/["“']([^"”']{12,})["”']/g) || [];
    for (const rawQuote of quoteMatches) {
      const cleanQuote = rawQuote.replace(/["“'”]/g, '').trim();
      if (cleanQuote.length >= 12 && sentences.length > 0) {
        for (const sent of sentences) {
          if (sent.toLowerCase().includes(cleanQuote.toLowerCase()) || cleanQuote.toLowerCase().includes(sent.toLowerCase())) {
            return { text: sent };
          }
        }
      }
    }
  }

  // 3. For Part 6 Text Completion, look for question number blank like [131] or ___131___
  if (q.part === 6 || !sentences.length) {
    const qNum = q.question_number;
    if (qNum) {
      for (const sent of sentences) {
        if (
          sent.includes(`[${qNum}]`) ||
          sent.includes(`(${qNum})`) ||
          sent.includes(`___${qNum}___`) ||
          sent.includes(`_${qNum}_`) ||
          new RegExp(`\\b${qNum}\\.`, 'i').test(sent)
        ) {
          return { text: sent };
        }
      }
    }
  }

  // 4. Fallback Token Overlap Scoring with Question Text + Correct Answer Option
  if (sentences.length > 0) {
    const correctLetter = (q.correct_answer || 'A').toUpperCase();
    const opts = q.options || {};
    const optProp = `option_${correctLetter.toLowerCase()}`;
    const correctOptText = opts[correctLetter] || (anyQ)[optProp] || '';

    const queryStr = `${q.question_text || ''} ${correctOptText}`.toLowerCase();
    const queryTokens = (queryStr.match(/[a-zA-Z]{3,}/g) || []).filter((t) => !STOPWORDS.has(t));
    const tokenSet = new Set(queryTokens);

    let bestSent = sentences[0];
    let bestScore = -1;

    for (const sent of sentences) {
      const sentTokens = (sent.toLowerCase().match(/[a-zA-Z]{3,}/g) || []).filter((t) => !STOPWORDS.has(t));
      let score = 0;
      for (const t of sentTokens) {
        if (tokenSet.has(t)) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestSent = sent;
      }
    }

    if (bestScore > 0) {
      return { text: bestSent };
    }
    return { text: sentences[0] };
  }

  return { text: '' };
}

/**
 * Highlight passage HTML or plain text with color-coded evidence marks
 */
export function highlightPassageWithEvidence(
  passageContent: string,
  evidenceList: EvidenceItem[]
): string {
  if (!passageContent || !evidenceList || evidenceList.length === 0) {
    return passageContent;
  }

  let result = passageContent;

  const colorPalettes = [
    {
      badge: 'bg-[#1E4E9E] text-white',
      mark: 'bg-amber-100/95 text-amber-950 border-b-2 border-amber-400 font-medium'
    },
    {
      badge: 'bg-emerald-600 text-white',
      mark: 'bg-emerald-100/95 text-emerald-950 border-b-2 border-emerald-400 font-medium'
    },
    {
      badge: 'bg-blue-600 text-white',
      mark: 'bg-blue-100/95 text-blue-950 border-b-2 border-blue-400 font-medium'
    },
    {
      badge: 'bg-purple-600 text-white',
      mark: 'bg-purple-100/95 text-purple-950 border-b-2 border-purple-400 font-medium'
    }
  ];

  evidenceList.forEach((ev, idx) => {
    const qNum = ev.qNum;
    const targetText = (ev.text || '').trim();
    if (!targetText || targetText.length < 8) return;

    const palette = colorPalettes[idx % colorPalettes.length];
    const badgeCls = ev.badgeClass || palette.badge;
    const markCls = ev.markClass || palette.mark;

    // Check if target text already exists in result (case-insensitive substring match)
    let matchedStr: string | null = null;
    const lowerResult = result.toLowerCase();
    const lowerTarget = targetText.toLowerCase();
    const exactIdx = lowerResult.indexOf(lowerTarget);

    if (exactIdx !== -1) {
      matchedStr = result.substring(exactIdx, exactIdx + targetText.length);
    } else {
      // Try subphrases of 4-8 words if exact sentence had slight punctuation mismatch
      const words = targetText.split(/\s+/);
      if (words.length >= 4) {
        for (let take = Math.min(8, words.length); take >= 4; take--) {
          const subphrase = words.slice(0, take).join(' ');
          const subIdx = lowerResult.indexOf(subphrase.toLowerCase());
          if (subIdx !== -1) {
            matchedStr = result.substring(subIdx, subIdx + subphrase.length);
            break;
          }
        }
      }
    }

    if (matchedStr && !result.includes(`id="evidence-clue-${qNum}"`)) {
      const replacement = `
        <mark id="evidence-clue-${qNum}" data-evidence-q="${qNum}" class="${markCls} px-1.5 py-0.5 rounded-md inline shadow-2xs transition-all duration-300 cursor-pointer hover:ring-2 hover:ring-amber-400" title="Nhấn để xem câu hỏi ${qNum}">
          <span class="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md ${badgeCls} text-[10px] font-black mr-1 shadow-2xs select-none pointer-events-none">
            🎯 Câu ${qNum}
          </span>
          ${matchedStr}
        </mark>
      `.trim();

      result = result.replace(matchedStr, replacement);
    }
  });

  return result;
}
