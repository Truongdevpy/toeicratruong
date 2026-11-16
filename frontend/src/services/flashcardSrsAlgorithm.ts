import { Flashcard } from '../types';

export interface SelectSessionCardsOptions {
  sessionSize?: number; // 10, 20, 0 (all)
  dailyNewLimit?: number; // Default 10
  learnedTodayCount?: number; // How many new cards were already learned today
  filterType?: 'all' | 'new' | 'due' | 'learning' | 'mastered';
}

/**
 * Thuật toán chọn thẻ cho phiên học SRS chuẩn khoa học:
 * 1. Nhóm 1 (Ưu tiên cao nhất): Thẻ đến hạn ôn hôm nay (is_due === true). Sắp xếp thẻ quá hạn lâu nhất lên trước.
 * 2. Nhóm 2: Thẻ đang học chưa đến hạn (is_learning === true và !is_due) nếu phiên chưa đủ số lượng.
 * 3. Nhóm 3: Thẻ mới (is_new === true). Áp dụng giới hạn số thẻ mới mỗi ngày (dailyNewLimit, mặc định 10).
 * 4. Nhóm 4 (Ưu tiên thấp nhất): Thẻ đã nắm vững (is_mastered === true). Chỉ xuất hiện nếu đến hạn ôn lại hoặc không còn thẻ nào khác.
 */
export function selectSessionCards(
  cards: Flashcard[],
  options: SelectSessionCardsOptions = {}
): Flashcard[] {
  const {
    sessionSize = 10,
    dailyNewLimit = 10,
    learnedTodayCount = 0,
    filterType = 'all'
  } = options;

  if (!cards || cards.length === 0) return [];

  // Nếu người dùng chọn lọc tường minh 1 trạng thái cụ thể:
  if (filterType === 'due') {
    return sortDueCards(cards.filter(c => c.is_due)).slice(0, sessionSize > 0 ? sessionSize : undefined);
  }
  if (filterType === 'new') {
    const remainingNewQuota = Math.max(0, dailyNewLimit - learnedTodayCount);
    const newPool = cards.filter(c => c.is_new);
    const capped = sessionSize > 0 ? Math.min(sessionSize, remainingNewQuota || sessionSize) : remainingNewQuota || newPool.length;
    return newPool.slice(0, capped);
  }
  if (filterType === 'learning') {
    return cards.filter(c => c.is_learning).slice(0, sessionSize > 0 ? sessionSize : undefined);
  }
  if (filterType === 'mastered') {
    return cards.filter(c => c.is_mastered).slice(0, sessionSize > 0 ? sessionSize : undefined);
  }

  // --- Chế độ phiên học thông minh tổng hợp (filterType === 'all') ---

  // 1. Thẻ đến hạn ôn (ưu tiên cao nhất, quá hạn lâu nhất trước)
  const dueCards = sortDueCards(cards.filter(c => c.is_due));

  // 2. Thẻ đang học (chưa đến hạn)
  const learningCards = cards.filter(c => c.is_learning && !c.is_due);

  // 3. Thẻ mới (áp dụng giới hạn thẻ mới mỗi ngày)
  const remainingNewQuota = Math.max(0, dailyNewLimit - learnedTodayCount);
  const rawNewCards = cards.filter(c => c.is_new);
  // Ưu tiên thẻ thuộc vùng điểm yếu lên đầu trong nhóm thẻ mới
  const sortedNewCards = [...rawNewCards].sort((a, b) => {
    if (a.is_weak_area && !b.is_weak_area) return -1;
    if (!a.is_weak_area && b.is_weak_area) return 1;
    return 0;
  });
  const newCards = sortedNewCards.slice(0, remainingNewQuota);

  // 4. Thẻ đã nắm vững (chỉ xuất hiện khi đến hạn hoặc khi bổ sung)
  const masteredCards = cards.filter(c => c.is_mastered && !c.is_due);

  const combined: Flashcard[] = [];

  // Đưa thẻ đến hạn lên đầu
  combined.push(...dueCards);

  // Nếu chưa đủ sessionSize, đưa thẻ đang học vào
  const targetTotal = sessionSize > 0 ? sessionSize : (dueCards.length + learningCards.length + newCards.length + masteredCards.length);

  for (const card of learningCards) {
    if (combined.length >= targetTotal) break;
    combined.push(card);
  }

  // Nếu vẫn chưa đủ, đưa thẻ mới vào
  for (const card of newCards) {
    if (combined.length >= targetTotal) break;
    combined.push(card);
  }

  // Cuối cùng nếu vẫn thiếu, mới lấy thẻ đã nắm vững
  for (const card of masteredCards) {
    if (combined.length >= targetTotal) break;
    combined.push(card);
  }

  return sessionSize > 0 ? combined.slice(0, sessionSize) : combined;
}

/**
 * Xáo thẻ an toàn: chỉ xáo trộn nội bộ trong từng nhóm ưu tiên,
 * KHÔNG phá vỡ thứ tự ưu tiên (Thẻ đến hạn vẫn luôn ở đầu).
 */
export function shuffleWithinPriorities(cards: Flashcard[]): Flashcard[] {
  if (!cards || cards.length <= 1) return [...cards];

  const due: Flashcard[] = [];
  const learning: Flashcard[] = [];
  const newCards: Flashcard[] = [];
  const mastered: Flashcard[] = [];
  const other: Flashcard[] = [];

  for (const c of cards) {
    if (c.is_due) due.push(c);
    else if (c.is_learning) learning.push(c);
    else if (c.is_new) newCards.push(c);
    else if (c.is_mastered) mastered.push(c);
    else other.push(c);
  }

  const shuffleArray = (arr: Flashcard[]) => [...arr].sort(() => Math.random() - 0.5);

  return [
    ...shuffleArray(due),
    ...shuffleArray(learning),
    ...shuffleArray(newCards),
    ...shuffleArray(mastered),
    ...shuffleArray(other)
  ];
}

/**
 * Sắp xếp thẻ quá hạn lâu nhất lên trước
 */
function sortDueCards(dueCards: Flashcard[]): Flashcard[] {
  return [...dueCards].sort((a, b) => {
    const timeA = a.next_review_at ? new Date(a.next_review_at).getTime() : 0;
    const timeB = b.next_review_at ? new Date(b.next_review_at).getTime() : 0;
    return timeA - timeB; // Thời điểm nhỏ hơn (quá hạn sớm hơn) lên trước
  });
}

/**
 * Tính toán lịch ôn kế tiếp và nhãn thời gian dự kiến cho 4 nút đánh giá:
 * Quên [1] (10 phút / 1 ngày), Khó [2] (1 ngày / 2 ngày), Được [3] (3 ngày), Dễ [4] (7 ngày)
 */
export interface SRSEstimate {
  rating: 'again' | 'hard' | 'good' | 'easy';
  label: string;
  shortcut: string;
  intervalText: string;
  intervalDays: number;
  stageChangeText: string;
}

export function getSRSEstimates(currentStage: number = 1): SRSEstimate[] {
  const stage = Math.max(1, Math.min(5, currentStage));

  return [
    {
      rating: 'again',
      label: 'Quên',
      shortcut: '1',
      intervalText: '10 phút',
      intervalDays: 1,
      stageChangeText: 'Giai đoạn 1'
    },
    {
      rating: 'hard',
      label: 'Khó',
      shortcut: '2',
      intervalText: '1 ngày',
      intervalDays: 1,
      stageChangeText: `Giai đoạn ${Math.max(1, stage)}`
    },
    {
      rating: 'good',
      label: 'Được',
      shortcut: '3',
      intervalText: stage <= 2 ? '3 ngày' : `${stage * 2} ngày`,
      intervalDays: stage <= 2 ? 3 : stage * 2,
      stageChangeText: `Giai đoạn ${Math.min(5, stage + 1)}`
    },
    {
      rating: 'easy',
      label: 'Dễ',
      shortcut: '4',
      intervalText: stage <= 2 ? '7 ngày' : `${stage * 3} ngày`,
      intervalDays: stage <= 2 ? 7 : stage * 3,
      stageChangeText: `Giai đoạn ${Math.min(5, stage + 2)}`
    }
  ];
}
