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
  level?: string;
  key_vocab?: { word: string; meaning: string }[];
  related_grammar?: string;
  question_type?: string;
  photo_type?: string;
  topic?: string;
  grammar_tags?: string[];
}

export interface Flashcard {
  id: number;
  word_id?: string;
  word: string;
  ipa: string;
  meaning: string;
  part_of_speech: string;
  example: string;
  example_vi?: string;
  collocations?: (string | { phrase?: string; meaning?: string; image_url?: string })[];
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
  is_new?: boolean;
  is_due?: boolean;
  is_learning?: boolean;
  is_mastered?: boolean;
  from_db?: boolean;
  is_weak_area?: boolean;
  next_review_at?: string | null;
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
  collocations?: (string | { phrase?: string; meaning?: string; image_url?: string })[];
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
  subtitle?: string;
  badge_color?: string;
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
  user_has_liked?: boolean;
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
  vocab_exp?: number;
  grammar_exp?: number;
  score_growth: number;
  accuracy_pct: number;
  badge: string;
  cheer_count: number;
  rank_change: number;
  primary_value: string;
  primary_num: number;
  is_me: boolean;
  is_anonymous?: boolean;
  is_cheered?: boolean;
  percentile_label?: string;
  points_to_next?: number | null;
  next_user_name?: string | null;
  score_status?: 'estimated' | 'insufficient_data';
  score_label?: string;
  score_hint?: string | null;
  score_explanation?: string;
}

export interface LeaderboardResponse {
  category: string;
  period: string;
  period_label: string;
  reset_countdown: string;
  league: string;
  total_participants: number;
  data_source_label?: string;
  is_mock?: boolean;
  cheered_today?: number[];
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
  image_url?: string;
  options?: {
    A?: string;
    B?: string;
    C?: string;
    D?: string;
    [key: string]: string | undefined;
  };
  question_text?: string;
  correct_answer?: string;
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

export interface AIAssessmentStats {
  user_id: number;
  scope: string;
  scope_name: string;
  time_range: string;
  total_count: number;
  correct_count: number;
  wrong_count: number;
  accuracy: number;
  data_confidence: 'insufficient' | 'low' | 'medium' | 'high';
  part_breakdown: Array<{
    part: number;
    part_name: string;
    total: number;
    correct: number;
    accuracy: number;
  }>;
  verified_strengths: Array<{
    topic: string;
    part: number;
    total: number;
    correct: number;
    accuracy: number;
    evidence: string;
  }>;
  verified_weaknesses: Array<{
    topic: string;
    part: number;
    total: number;
    correct: number;
    accuracy: number;
    evidence: string;
  }>;
  need_more_data_topics: Array<{
    topic: string;
    part: number;
    total: number;
    correct: number;
    accuracy: number;
    reason: string;
  }>;
  avg_time_sec: number;
  too_fast_count: number;
  too_slow_count: number;
  dominant_option?: string | null;
  trend_description: string;
  repeated_wrong_count: number;
  representative_wrong: Array<{
    id: string;
    part: number;
    topic: string;
    question_text: string;
    selected_option: string;
    correct_option: string;
    is_repeated: boolean;
  }>;
}

export interface AIAssessmentResult {
  summary_vi: string;
  data_confidence: 'insufficient' | 'low' | 'medium' | 'high';
  strengths: Array<{
    topic: string;
    evidence: string;
    comment_vi: string;
  }>;
  weaknesses: Array<{
    topic: string;
    evidence: string;
    likely_cause_vi: string;
    example_question_ids: string[];
    priority: number;
  }>;
  patterns_vi: string[];
  trend_vi: string;
  study_plan: Array<{
    day_or_step: string;
    action_vi: string;
    link_target: {
      type: string;
      params: Record<string, any>;
    };
  }>;
  encouragement_vi: string;
}

export interface AIAssessmentResponse {
  id?: number;
  scope: string;
  scope_name: string;
  time_range: string;
  stats: AIAssessmentStats;
  assessment: AIAssessmentResult;
  created_at: string;
  cached?: boolean;
}
