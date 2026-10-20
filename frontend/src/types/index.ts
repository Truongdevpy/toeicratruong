export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'student' | 'admin' | 'vip';
  avatar_url?: string;
  onboarding_completed: boolean;
  placement_completed: boolean;
  current_score?: number;
  target_score?: number;
  membership_tier?: string;
  is_vip?: boolean;
  is_admin?: boolean;
}

export interface UserProfile {
  current_score: number;
  target_score: number;
  daily_minutes: number;
  today_minutes_completed: number;
  streak_days: number;
  onboarding_completed: boolean;
  placement_completed: boolean;
  cefr_level: string;
  focus_skills: string[];
  weak_areas: string[];
  strengths: string[];
}

export interface LearningNode {
  id: number;
  order_index: number;
  title: string;
  description: string;
  skill: string;
  status: 'completed' | 'in_progress' | 'locked';
  progress_pct: number;
  estimated_hours: number;
  target_score_checkpoint?: number;
  lessons_count: number;
  completed_lessons: number;
}

export interface LearningPath {
  id: number;
  title: string;
  current_score: number;
  target_score: number;
  estimated_weeks: number;
  overall_progress_pct: number;
  adaptive_weights: Record<string, number>;
  adaptation_reason: string;
  nodes: LearningNode[];
}

export interface Question {
  id: string;
  part: number;
  section: string;
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d?: string;
  correct_answer?: string;
  audio_url?: string;
  image_url?: string;
  passage_text?: string;
  transcript?: string;
  vietnamese_translation?: string;
  explanation_vi?: string;
  explanation_en?: string;
  explanation?: string;
  evidence?: string;
  evidence_vi?: string;
  options?: Record<string, string>;
  option_translations?: Record<string, string>;
  difficulty_level?: number;
  key_vocab?: { word: string; meaning: string }[];
  related_grammar?: string;
}

export interface Flashcard {
  id: number;
  word_id: string;
  word: string;
  ipa: string;
  meaning: string;
  part_of_speech: string;
  example: string;
  example_vi?: string;
  collocations?: string[];
  word_family?: string[];
  toeic_tip?: string;
  audio_url?: string;
  srs_stage: number;
  interval_days: number;
  repetitions: number;
  is_favorite: boolean;
  topic?: string;
  topic_name?: string;
  topic_icon?: string;
  is_learned?: boolean;
  from_db?: boolean;
}

export interface VocabWord {
  id: string;
  word: string;
  ipa: string;
  meaning: string;
  part_of_speech: string;
  example: string;
  example_vi?: string;
  toeic_tip?: string;
  level: string;
  category: string;
  audio_url?: string;
  audio_us?: string;
  audio_uk?: string;
  image_url?: string;
  synonyms?: string[];
  collocations?: string[];
}

export interface GrammarQuestion {
  id: string;
  question_text: string;
  question?: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  options?: string[];
  correct_answer: string;
  correct?: string;
  explanation_vi?: string;
  explanation?: string;
  translation_vi?: string;
  translation?: string;
}

export interface GrammarTopic {
  id: string;
  slug?: string;
  title_en: string;
  title_vi: string;
  description_vi?: string;
  category: string;
  group?: string;
  theory_html: string;
  formula?: string;
  examples: { en: string; vi: string }[];
  tips: string[];
  questions_count?: number;
  lessons_count?: number;
  subtopics_count?: number;
  practice_questions?: GrammarQuestion[];
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link?: string;
  created_at: string;
  created_at_raw?: string;
}

export interface AchievementItem {
  id: number;
  code: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  max_progress: number;
  unlocked_at?: string;
}

export interface CommunityPost {
  id: number;
  author_id?: number;
  author_name: string;
  author_avatar?: string;
  title: string;
  content: string;
  category: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  created_at_raw?: string;
  comments: {
    id: number;
    author_id?: number;
    author_name: string;
    author_avatar?: string;
    content: string;
    created_at: string;
    created_at_raw?: string;
  }[];
}

export interface AIReviewItem {
  id: number;
  skill: string;
  topic: string;
  difficulty: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string;
  status: string;
  created_at: string;
}


export interface LeaderboardEntry {
  rank: number;
  id: number;
  user_id?: number | null;
  full_name: string;
  avatar_url: string;
  school_or_org: string;
  current_score: number;
  target_score: number;
  streak_days: number;
  questions_count: number;
  exp_points: number;
  score_growth: number;
  accuracy_pct: number;
  badge: string;
  cheer_count: number;
  rank_change: number;
  primary_value: string;
  primary_num: number;
  is_me: boolean;
  percentile_label?: string;
  points_to_next?: number;
  next_user_name?: string;
}

export interface LeaderboardResponse {
  category: string;
  period: string;
  period_label: string;
  reset_countdown: string;
  league: string;
  total_participants: number;
  podium: LeaderboardEntry[];
  rankings: LeaderboardEntry[];
  my_rank: LeaderboardEntry | null;
  summary: {
    total_participants: number;
    average_score: number;
    highest_streak: number;
    total_questions_completed: number;
    reward_headline: string;
  };
  leagues: {
    id: string;
    label: string;
    desc: string;
  }[];
}

export interface LeaderboardRules {
  title: string;
  description: string;
  scoring_system: { activity: string; exp: string; desc: string }[];
  leagues_info: { league: string; criteria: string; perk: string }[];
  rewards: { rank: string; reward: string }[];
  reset_cycle: string;
}

export interface DictationWordDiff {
  status: 'correct' | 'missing' | 'extra' | 'wrong';
  word: string;
  target?: string;
}

export interface DictationLineDiff {
  line_number: number;
  label?: string;
  target_line: string;
  user_line: string;
  diff: DictationWordDiff[];
  accuracy_pct: number;
}

export interface DictationExplanation {
  translation_vi: string;
  phonetic_tips: string[];
  grammar_note: string;
  key_vocab: {
    word: string;
    ipa: string;
    meaning: string;
    part_of_speech: string;
  }[];
}

export interface DictationCheckResponse {
  is_correct: boolean;
  accuracy: number;
  accuracy_pct: number;
  stats: {
    correct_words: number;
    wrong_words: number;
    missing_words: number;
    extra_words: number;
    total_target_words: number;
  };
  target_text: string;
  diff: DictationWordDiff[];
  line_diffs?: DictationLineDiff[];
  feedback: string;
  segments?: string[];
  explanation?: DictationExplanation;
}

export interface DictationChallenge {
  id: string;
  set_id?: string;
  part: number;
  title: string;
  audio_url: string;
  full_sentence: string;
  lines?: string[];
  blanks_sentence?: string;
  keywords?: string[];
  vietnamese_translation?: string;
  difficulty?: string;
  segments?: string[];
  phonetic_tips?: string[];
  key_vocab?: {
    word: string;
    ipa: string;
    meaning: string;
    part_of_speech: string;
  }[];
}
