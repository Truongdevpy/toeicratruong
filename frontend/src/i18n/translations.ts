export interface TranslationSet {
  accountSystem: string;
  aiFeatures: string;
  aiTutorBadge: string;
  audioSpeedTitle: string;
  autoAdvanceDesc: string;
  autoAdvanceTitle: string;
  bilingualDesc: string;
  bilingualTitle: string;
  community: string;
  daysStreak: string;
  defaultOn: string;
  done: string;
  etsRules: string;
  etsStandard: string;
  evidenceDesc: string;
  evidenceTitle: string;
  floatingAITutorDesc: string;
  floatingAITutorTitle: string;
  floatingButtonsTitle: string;
  floatingChatDesc: string;
  floatingChatTitle: string;
  interfaceLanguage: string;
  leaderboard: string;
  login: string;
  logout: string;
  messagesBadge: string;
  openMenu: string;
  planBenefits: string;
  practiceGroup: string;
  previewRightCorner: string;
  privacyPolicy: string;
  resetDefault: string;
  settingsSubtitle: string;
  settingsTitle: string;
  sfxDesc: string;
  sfxTitle: string;
  studyExperienceTitle: string;
  studyNotifications: string;
  systemSettings: string;
  termsOfUse: string;
  tipsDesc: string;
  tipsTitle: string;
  vocabDesc: string;
  vocabTitle: string;
  [key: string]: string;
}

export const TRANSLATIONS: Record<'vi' | 'en', TranslationSet> = {
  vi: {
    accountSystem: 'Tài khoản & Hệ thống',
    aiFeatures: 'Tính năng AI',
    aiTutorBadge: 'Trợ lý AI',
    audioSpeedTitle: 'Tốc độ phát âm thanh',
    autoAdvanceDesc: 'Tự động chuyển sang câu hỏi tiếp theo sau khi chọn đáp án đúng',
    autoAdvanceTitle: 'Tự động chuyển câu',
    bilingualDesc: 'Hiển thị song ngữ Anh - Việt cho phần giải thích và mẹo làm bài',
    bilingualTitle: 'Hiển thị song ngữ',
    community: 'Cộng đồng học viên',
    daysStreak: 'ngày liên tục',
    defaultOn: 'Mặc định bật',
    done: 'Hoàn tất',
    etsRules: 'Quy chế thi ETS',
    etsStandard: 'Chuẩn ETS',
    evidenceDesc: 'Tô sáng đoạn trích làm căn cứ trả lời trong bài đọc hoặc transcript',
    evidenceTitle: 'Hiện dẫn chứng câu hỏi',
    floatingAITutorDesc: 'Bật trợ lý gia sư AI nổi ở góc màn hình giải đáp thắc mắc',
    floatingAITutorTitle: 'Trợ lý Gia sư AI nổi',
    floatingButtonsTitle: 'Cài đặt nút nổi & Widget',
    floatingChatDesc: 'Hiển thị bong bóng trò chuyện cộng đồng và bạn học cùng phòng',
    floatingChatTitle: 'Bong bóng Chat nổi',
    interfaceLanguage: 'Ngôn ngữ giao diện',
    leaderboard: 'Bảng xếp hạng thi đua',
    login: 'Đăng nhập học viên',
    logout: 'Đăng xuất',
    messagesBadge: 'Tin nhắn',
    openMenu: 'Mở menu',
    planBenefits: 'Quyền lợi gói học & VIP',
    practiceGroup: 'Luyện tập theo Part',
    previewRightCorner: 'Xem trước ở góc phải',
    privacyPolicy: 'Chính sách bảo mật',
    resetDefault: 'Khôi phục mặc định',
    settingsSubtitle: 'Tùy chỉnh giao diện, âm thanh và trợ lý học tập cá nhân hóa',
    settingsTitle: 'Cài đặt & Nút nổi',
    sfxDesc: 'Phát âm thanh thông báo khi trả lời đúng hoặc hoàn thành bài thi',
    sfxTitle: 'Hiệu ứng âm thanh (SFX)',
    studyExperienceTitle: 'Trải nghiệm luyện đề & Thi thử',
    studyNotifications: 'Thông báo học tập',
    systemSettings: 'Cài đặt hệ thống',
    termsOfUse: 'Điều khoản sử dụng',
    tipsDesc: 'Gợi ý phương pháp loại trừ đáp án nhiễu theo từng Part',
    tipsTitle: 'Mẹo thi TOEIC thông minh',
    vocabDesc: 'Tự động gạch chân và giải nghĩa từ vựng học thuật quan trọng',
    vocabTitle: 'Highlight từ vựng trọng tâm',
  },
  en: {
    accountSystem: 'Account & System',
    aiFeatures: 'AI Features',
    aiTutorBadge: 'AI Tutor',
    audioSpeedTitle: 'Audio Playback Speed',
    autoAdvanceDesc: 'Automatically advance to the next question when answered correctly',
    autoAdvanceTitle: 'Auto Advance Question',
    bilingualDesc: 'Display bilingual English - Vietnamese explanations and tips',
    bilingualTitle: 'Bilingual Explanations',
    community: 'Student Community',
    daysStreak: 'days streak',
    defaultOn: 'Default ON',
    done: 'Done',
    etsRules: 'ETS Test Guidelines',
    etsStandard: 'ETS Standard',
    evidenceDesc: 'Highlight key evidence in reading passages and audio transcripts',
    evidenceTitle: 'Show Evidence Highlights',
    floatingAITutorDesc: 'Show floating AI Tutor assistant widget at bottom screen corner',
    floatingAITutorTitle: 'Floating AI Tutor',
    floatingButtonsTitle: 'Floating Buttons & Widgets',
    floatingChatDesc: 'Show floating community chat bubble with study peers',
    floatingChatTitle: 'Floating Chat Bubble',
    interfaceLanguage: 'Interface Language',
    leaderboard: 'Leaderboard & Ranks',
    login: 'Student Login',
    logout: 'Log Out',
    messagesBadge: 'Messages',
    openMenu: 'Open Menu',
    planBenefits: 'VIP Benefits & Plan Matrix',
    practiceGroup: 'Practice by Part',
    previewRightCorner: 'Preview in bottom right',
    privacyPolicy: 'Privacy Policy',
    resetDefault: 'Reset Defaults',
    settingsSubtitle: 'Customize UI, sound effects and personalized learning assistants',
    settingsTitle: 'Settings & Widgets',
    sfxDesc: 'Play sound effects when answering correctly or completing exams',
    sfxTitle: 'Sound Effects (SFX)',
    studyExperienceTitle: 'Practice & Mock Test Experience',
    studyNotifications: 'Study Notifications',
    systemSettings: 'System Settings',
    termsOfUse: 'Terms of Use',
    tipsDesc: 'Show elimination tips and strategies for each TOEIC Part',
    tipsTitle: 'Smart TOEIC Tips',
    vocabDesc: 'Underline and define essential academic & business vocabulary',
    vocabTitle: 'Highlight Key Vocabulary',
  },
};