import { GrammarLessonDefinition } from '../types/grammarDuo';

export const NOUN_LESSONS_DATA: GrammarLessonDefinition[] = [
  {
    lessonId: 'noun-01',
    title: 'Nh\u1eadn di\u1ec7n Danh t\u1eeb & \u0110u\u00f4i ch\u1ec9 ng\u01b0\u1eddi/v\u1eadt',
    subtitle: 'N\u1eafm ch\u1eafc c\u00e1c h\u1eadu t\u1ed1 -tion, -ment, -er, -ee',
    theoryCards: [
      {
        title: 'V\u1ecb tr\u00ed Danh t\u1eeb trong c\u00e2u TOEIC',
        badge: 'Quy t\u1eafc v\u00e0ng',
        badgeColor: 'bg-blue-50 text-blue-700',
        highlightedSentence: {
          sentence: 'The new manager signed the important contract yesterday.', segments: [], highlights: [
            { text: 'manager', label: 'Danh t\u1eeb ch\u1ee7 ng\u1eef (S)', color: 'bg-blue-100 text-blue-800' },
            { text: 'contract', label: 'Danh t\u1eeb t\u00e2n ng\u1eef (O)', color: 'bg-emerald-100 text-emerald-800' }
          ]
        },
        ruleList: [
          { title: 'Sau m\u1ea1o t\u1eeb (a, an, the)', desc: 'The + Noun (v\u00ed d\u1ee5: the agreement)' },
          { title: 'Sau t\u00ednh t\u1eeb s\u1edf h\u1eefu', desc: 'My, our, their, her, his + Noun' },
          { title: 'Sau gi\u1edbi t\u1eeb', desc: 'In, on, at, for, with + Noun / Noun Phrase' }
        ],
        trapComparison: {
          correct: 'The application was submitted on time.',
          incorrect: 'The applicant was submitted on time.',
          explanation: 'B\u1eaby danh t\u1eeb ch\u1ec9 ng\u01b0\u1eddi v\u00e0 danh t\u1eeb ch\u1ec9 v\u1eadt/s\u1ef1 vi\u1ec7c.'
        },
        miniCheck: {
          question: 'Please submit your ______ before Friday.',
          options: ['confirm', 'confirmation', 'confirmed', 'confirming'],
          correctIndex: 1,
          explanation: 'Sau t\u00ednh t\u1eeb s\u1edf h\u1eefu your c\u1ea7n m\u1ed9t danh t\u1eeb.'
        }
      }
    ],
    questions: [
      {
        id: 'noun-q1',
        type: 'multiple_choice',
        difficulty: 1,
        conceptTags: ['Nouns'],
        question: 'All employees must wear their identification ______ when inside the factory.',
        options: ['A. badges', 'B. badly', 'C. badgeable', 'D. badging'],
        correct: 'A',
        explanation: 'C\u1ee5m danh t\u1eeb identification badges (th\u1ebb nh\u1eadn di\u1ec7n).',
        translation: 'T\u1ea5t c\u1ea3 nh\u00e2n vi\u00ean ph\u1ea3i \u0111eo th\u1ebb nh\u1eadn di\u1ec7n khi \u1edf b\u00ean trong nh\u00e0 m\u00e1y.'
      }
    ]
  }
];
