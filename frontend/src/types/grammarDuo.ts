export interface TheoryCard {
  id?: string;
  title: string;
  badge?: string;
  badgeColor?: string;
  highlightedSentence?: {
    sentence?: string;
    highlights?: Array<{ text: string; label: string; color: string }>;
    segments?: Array<{ text: string; role: 'subject' | 'verb' | 'object' | 'target' | string }>;
    vi?: string;
  };
  ruleList?: (string | { title: string; desc: string; icon?: string })[];
  trapComparison?: {
    correct: string;
    wrong?: string;
    incorrect?: string;
    note?: string;
    explanation?: string;
  };
  miniCheck?: {
    question: string;
    options: string[];
    correctIndex?: number;
    correct?: string;
    explanation: string;
  };
}

export interface InteractiveDuoQuestion {
  id: string;
  type: 'multiple_choice' | 'fill_in_the_blank' | 'sentence_reorder' | string;
  difficulty?: number;
  conceptTags?: string[];
  question: string;
  options: string[];
  correct: string;
  explanation: string;
  translation?: string;
}

export interface GrammarLessonDefinition {
  lessonId: string;
  title: string;
  subtitle?: string;
  theoryCards?: TheoryCard[];
  questions: InteractiveDuoQuestion[];
}
