// -*- coding: utf-8 -*-
import {
  Edit3,
  Headphones,
  Crosshair,
  BookOpen,
  CloudRain,
  Link2,
  Zap,
  Image as ImageIcon,
  Layers
} from 'lucide-react';
import { GameDefinition } from './gameTypes';

export const VOCAB_TOPICS = [
  { id: 'all', label: 'Tất cả chủ đề', icon: '🌟' },
  { id: 'office', label: 'Văn phòng & Công sở', icon: '🏢' },
  { id: 'business', label: 'Hợp đồng & Thương mại', icon: '💼' },
  { id: 'finance', label: 'Tài chính & Ngân hàng', icon: '💰' },
  { id: 'travel', label: 'Du lịch & Khách sạn', icon: '✈️' },
  { id: 'hr', label: 'Nhân sự & Tuyển dụng', icon: '👥' },
  { id: 'marketing', label: 'Marketing & Bán hàng', icon: '📈' },
  { id: 'technology', label: 'Công nghệ & Kỹ thuật', icon: '💻' }
];

export const TOEIC_PARTS = [
  { id: 'part1', label: 'Part 1: Tranh ảnh', icon: '🖼️', badge: '6 câu' },
  { id: 'part2', label: 'Part 2: Hỏi & Đáp', icon: '💬', badge: '25 câu' },
  { id: 'part3', label: 'Part 3: Hội thoại', icon: '👥', badge: '39 câu' },
  { id: 'part4', label: 'Part 4: Bài nói ngắn', icon: '🎙️', badge: '30 câu' },
  { id: 'part5', label: 'Part 5: Điền câu', icon: '📝', badge: '30 câu' },
  { id: 'part6', label: 'Part 6: Điền đoạn văn', icon: '📑', badge: '16 câu' },
  { id: 'part7', label: 'Part 7: Đọc hiểu', icon: '📖', badge: '54 câu' }
];

export const GRAMMAR_LEVELS = [
  { id: 'level1', label: 'Cơ bản (< 450 TOEIC)', icon: '🌱', badge: 'Dễ' },
  { id: 'level2', label: 'Trung cấp (450 – 650)', icon: '🌿', badge: 'Vừa' },
  { id: 'level3', label: 'Nâng cao (650+ TOEIC)', icon: '🌲', badge: 'Khó' }
];

export const LISTENING_LEVELS = [
  { id: 'slow', label: 'Tốc độ chậm (0.8x)', icon: '🐢', badge: 'Luyện tai' },
  { id: 'normal', label: 'Tốc độ chuẩn ETS (1.0x)', icon: '🎯', badge: 'Thi thật' },
  { id: 'fast', label: 'Tốc độ nhanh (1.2x)', icon: '⚡', badge: 'Phản xạ' }
];

export const GAME_DEFINITIONS: GameDefinition[] = [
  // --- NHÓM 1: TỪ VỰNG (VOCAB) ---
  {
    id: 'word_blast',
    title: 'Word Blast',
    subtitle: 'Bắn trúng từ đúng nghĩa',
    description: 'Bắn hạ mục tiêu từ vựng chính xác trước khi hết giờ. Tăng phản xạ nhận diện từ TOEIC.',
    category: 'vocab',
    categoryLabel: 'Từ vựng',
    icon: Crosshair,
    color: '#06B6D4',
    accentClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    tagColor: 'text-cyan-300 bg-cyan-500/20 border-cyan-500/30',
    setupType: 'topic',
    options: VOCAB_TOPICS,
    estimatedMinutes: '3–5 phút',
    previewType: 'word_blast'
  },
  {
    id: 'quiz',
    title: 'Trắc nghiệm',
    subtitle: 'Chọn nhanh nghĩa của từ',
    description: 'Thử thách chọn đáp án đúng trong 4 phương án cho từ vựng trọng tâm TOEIC.',
    category: 'vocab',
    categoryLabel: 'Từ vựng',
    icon: BookOpen,
    color: '#06B6D4',
    accentClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    tagColor: 'text-cyan-300 bg-cyan-500/20 border-cyan-500/30',
    setupType: 'topic',
    options: VOCAB_TOPICS,
    estimatedMinutes: '4–6 phút',
    previewType: 'quiz'
  },
  {
    id: 'word_rain',
    title: 'Mưa từ',
    subtitle: 'Gõ từ trước khi nghĩa rơi chạm đất',
    description: 'Mưa từ rơi với tốc độ tăng dần. Gõ chuẩn chính tả từ vựng tiếng Anh để cứu điểm.',
    category: 'vocab',
    categoryLabel: 'Từ vựng',
    icon: CloudRain,
    color: '#06B6D4',
    accentClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    tagColor: 'text-cyan-300 bg-cyan-500/20 border-cyan-500/30',
    setupType: 'topic',
    options: VOCAB_TOPICS,
    estimatedMinutes: '3–5 phút',
    previewType: 'word_rain'
  },
  {
    id: 'match_words',
    title: 'Nối từ',
    subtitle: 'Nối 4 từ với 4 nghĩa tương ứng',
    description: 'Tìm và nối từng cặp từ tiếng Anh với nghĩa tiếng Việt chuẩn xác trong thời gian ngắn nhất.',
    category: 'vocab',
    categoryLabel: 'Từ vựng',
    icon: Link2,
    color: '#06B6D4',
    accentClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    tagColor: 'text-cyan-300 bg-cyan-500/20 border-cyan-500/30',
    setupType: 'topic',
    options: VOCAB_TOPICS,
    estimatedMinutes: '3–4 phút',
    previewType: 'match_words'
  },
  {
    id: 'collocation',
    title: 'Collocation',
    subtitle: 'Điền chữ đi kèm cho trọn cụm',
    description: 'Nắm vững các cụm cố định xuất hiện dày đặc trong đề thi TOEIC: make, do, take, have...',
    category: 'vocab',
    categoryLabel: 'Từ vựng',
    icon: Zap,
    color: '#06B6D4',
    accentClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    tagColor: 'text-cyan-300 bg-cyan-500/20 border-cyan-500/30',
    setupType: 'topic',
    options: VOCAB_TOPICS,
    estimatedMinutes: '3–5 phút',
    previewType: 'collocation'
  },

  // --- NHÓM 2: NGỮ PHÁP (GRAMMAR) ---
  {
    id: 'grammar',
    title: 'Ngữ pháp',
    subtitle: 'Chọn từ đúng điền chỗ trống',
    description: 'Luyện câu hỏi ngữ pháp Part 5 phân theo 3 cấp độ từ 200 đến 800+ TOEIC: từ loại, thì, mệnh đề.',
    category: 'grammar',
    categoryLabel: 'Ngữ pháp',
    icon: Edit3,
    color: '#6366F1',
    accentClass: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    tagColor: 'text-indigo-300 bg-indigo-500/20 border-indigo-500/30',
    setupType: 'level',
    options: GRAMMAR_LEVELS,
    estimatedMinutes: '5–8 phút',
    previewType: 'grammar'
  },
  {
    id: 'sentence_build',
    title: 'Sentence',
    subtitle: 'Xếp lại câu đúng trật tự',
    description: 'Chạm ghép các mảnh từ để tạo thành câu hoàn chỉnh đúng cấu trúc ngữ pháp chuẩn TOEIC.',
    category: 'grammar',
    categoryLabel: 'Ngữ pháp',
    icon: Layers,
    color: '#6366F1',
    accentClass: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    tagColor: 'text-indigo-300 bg-indigo-500/20 border-indigo-500/30',
    setupType: 'level',
    options: GRAMMAR_LEVELS,
    estimatedMinutes: '4–6 phút',
    previewType: 'sentence_build'
  },

  // --- NHÓM 3: NGHE (LISTENING) ---
  {
    id: 'dictation',
    title: 'Nghe chép',
    subtitle: 'Nghe audio rồi gõ lại câu',
    description: 'Bắt trọn âm đuôi và từ nối với câu thoại ngắn trích từ Part 1 & Part 2 đề thi thật.',
    category: 'listening',
    categoryLabel: 'Kỹ năng nghe',
    icon: Headphones,
    color: '#F59E0B',
    accentClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    tagColor: 'text-amber-300 bg-amber-500/20 border-amber-500/30',
    setupType: 'level',
    options: LISTENING_LEVELS,
    estimatedMinutes: '5–7 phút',
    previewType: 'dictation'
  },
  {
    id: 'photo_match',
    title: 'Part 1 Photo',
    subtitle: 'Quan sát tranh và chọn hành động',
    description: 'Luyện kỹ năng miêu tả tranh Part 1: hành động người, vật thể và khung cảnh văn phòng.',
    category: 'listening',
    categoryLabel: 'Kỹ năng nghe',
    icon: ImageIcon,
    color: '#F59E0B',
    accentClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    tagColor: 'text-amber-300 bg-amber-500/20 border-amber-500/30',
    setupType: 'part',
    options: [
      { id: 'people_single', label: 'Tranh 1 người', icon: '👤', badge: 'Part 1' },
      { id: 'people_group', label: 'Tranh nhiều người', icon: '👥', badge: 'Part 1' },
      { id: 'objects', label: 'Tranh đồ vật & cảnh', icon: '📦', badge: 'Part 1' }
    ],
    estimatedMinutes: '3–5 phút',
    previewType: 'photo_match'
  }
];

export const GAME_CATEGORY_GROUPS = [
  {
    key: 'vocab' as const,
    title: 'Rèn luyện từ vựng',
    description: 'Nạp nhanh và củng cố phản xạ nhận diện từ vựng TOEIC thông dụng theo chủ đề.',
    accentColor: '#06B6D4',
    badge: '5 game'
  },
  {
    key: 'grammar' as const,
    title: 'Củng cố ngữ pháp',
    description: 'Ôn luyện ngữ pháp câu và cấu trúc Part 5 thông qua bài tập điền từ và ghép câu.',
    accentColor: '#6366F1',
    badge: '2 game'
  },
  {
    key: 'listening' as const,
    title: 'Luyện nghe phản xạ',
    description: 'Tập trung nghe bắt âm chi tiết, chép chính tả và phản xạ miêu tả hình ảnh Part 1.',
    accentColor: '#F59E0B',
    badge: '2 game'
  }
];
