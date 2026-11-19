import React from 'react';
import {
  LayoutDashboard,
  Compass,
  Headphones,
  Volume2,
  BookOpen,
  Bookmark,
  CheckSquare,
  Mic,
  PenTool,
  Gamepad2,
  FileText,
  Sparkles,
  BarChart3,
  Trophy,
  Users,
  Home,
  Layers,
  Menu,
} from 'lucide-react';

export interface NavItemConfig {
  id: string;
  label: string;
  path?: string;
  icon?: React.ComponentType<{ className?: string }>;
  desc?: string;
  isAction?: boolean;
  actionType?: 'settings' | 'rbac';
}

export interface NavGroupConfig {
  id: string;
  title: string;
  items: NavItemConfig[];
}

export interface BottomTabConfig {
  id: string;
  label: string;
  path?: string;
  icon: React.ComponentType<{ className?: string }>;
  isMore?: boolean;
}

export const isRouteActive = (currentPath: string, targetPath?: string): boolean => {
  if (!targetPath) return false;
  const current = (currentPath.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/').toLowerCase();
  const target = (targetPath.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/').toLowerCase();

  if (target === '/') return current === '/';
  return current === target || current.startsWith(target + '/');
};

export const getNavGroups = (lang: string = 'vi'): NavGroupConfig[] => {
  const isEn = lang === 'en';

  return [
    {
      id: 'main',
      title: isEn ? 'Overview' : 'Tổng quan',
      items: [
        {
          id: 'dashboard',
          label: isEn ? 'Dashboard' : 'Bảng điều khiển',
          path: '/dashboard',
          icon: LayoutDashboard,
          desc: isEn ? 'Personal overview & statistics' : 'Tổng quan học tập cá nhân',
        },
        {
          id: 'learning-path',
          label: isEn ? 'Learning Path' : 'Lộ trình TOEIC',
          path: '/learning-path',
          icon: Compass,
          desc: isEn ? 'Customized study roadmap' : 'Lộ trình chinh phục mục tiêu',
        },
      ],
    },
    {
      id: 'practice',
      title: isEn ? 'Practice Skills' : 'Luyện tập kỹ năng',
      items: [
        {
          id: 'dictation',
          label: isEn ? 'Dictation' : 'Nghe chép chính tả',
          path: '/practice/dictation',
          icon: Headphones,
          desc: isEn ? 'ETS listening dictation' : 'Luyện tai nghe chuyên sâu',
        },
        {
          id: 'listening',
          label: isEn ? 'Listening (Part 1-4)' : 'Luyện nghe (Part 1-4)',
          path: '/practice/listening',
          icon: Volume2,
          desc: isEn ? 'TOEIC Listening simulation' : 'Luyện nghe theo Part chuẩn ETS',
        },
        {
          id: 'reading',
          label: isEn ? 'Reading (Part 5-7)' : 'Luyện đọc (Part 5-7)',
          path: '/practice/reading',
          icon: BookOpen,
          desc: isEn ? 'TOEIC Reading training' : 'Luyện đọc hiểu & ngữ pháp',
        },
        {
          id: 'vocabulary',
          label: isEn ? 'Vocabulary & Pronunciation' : 'Lộ trình Từ vựng',
          path: '/practice/vocabulary',
          icon: Bookmark,
          desc: isEn ? '600 essential TOEIC words' : 'Lộ trình Chinh phục Từ vựng',
        },
        {
          id: 'grammar',
          label: isEn ? 'Grammar Master' : 'Ngữ pháp',
          path: '/practice/grammar',
          icon: CheckSquare,
          desc: isEn ? 'Gamified grammar lessons' : 'Lộ trình Chinh phục Ngữ pháp',
        },
        {
          id: 'speaking',
          label: isEn ? 'Speaking' : 'Luyện Speaking (AI)',
          path: '/practice/speaking',
          icon: Mic,
          desc: isEn ? 'AI pronunciation scoring' : 'Chấm điểm phát âm tự động',
        },
        {
          id: 'writing',
          label: isEn ? 'Writing' : 'Luyện Writing (AI)',
          path: '/practice/writing',
          icon: PenTool,
          desc: isEn ? 'Sentence & essay writing' : 'Chấm bài viết tiếng Anh AI',
        },
        {
          id: 'games',
          label: isEn ? 'Mini-Games' : 'Đấu trường Game',
          path: '/games',
          icon: Gamepad2,
          desc: isEn ? 'Vocabulary & Grammar games' : 'Luyện từ vựng & phản xạ qua 9 mini-games',
        },
      ],
    },
    {
      id: 'exams',
      title: isEn ? 'Exams & Tools' : 'Thi thử & Công cụ',
      items: [
        {
          id: 'mock-tests',
          label: isEn ? 'Mock Tests (80 Sets)' : 'Đề thi',
          path: '/mock-tests',
          icon: FileText,
          desc: isEn ? 'Real exam conditions' : 'Kho 80 đề thi chuẩn format ETS',
        },
        {
          id: 'ai-tutor',
          label: isEn ? 'AI Tutor' : 'Gia sư AI cá nhân hóa',
          path: '/ai-tutor',
          icon: Sparkles,
          desc: isEn ? 'Personal 1-on-1 tutoring' : 'Giải đáp mọi thắc mắc 24/7',
        },
        {
          id: 'statistics',
          label: isEn ? 'Score Analytics' : 'Thống kê điểm số',
          path: '/statistics',
          icon: BarChart3,
          desc: isEn ? 'Detailed score breakdown' : 'Phân tích điểm mạnh & điểm yếu',
        },
        {
          id: 'leaderboard',
          label: isEn ? 'Leaderboard' : 'Bảng xếp hạng thi đua',
          path: '/leaderboard',
          icon: Trophy,
          desc: isEn ? 'Compete with peers' : 'Vinh danh học viên xuất sắc',
        },
        {
          id: 'community',
          label: isEn ? 'Community' : 'Cộng đồng học viên',
          path: '/community',
          icon: Users,
          desc: isEn ? 'Discussion & study groups' : 'Chia sẻ kinh nghiệm luyện thi',
        },
      ],
    },
  ];
};

export const getBottomTabs = (lang: string = 'vi'): BottomTabConfig[] => {
  const isEn = lang === 'en';

  return [
    {
      id: 'home',
      label: isEn ? 'Home' : 'Trang chủ',
      path: '/',
      icon: Home,
    },
    {
      id: 'dictation',
      label: isEn ? 'Dictation' : 'Nghe chép',
      path: '/practice/dictation',
      icon: Headphones,
    },
    {
      id: 'practice',
      label: isEn ? 'Practice' : 'Luyện thi',
      path: '/learning-path',
      icon: Layers,
    },
    {
      id: 'mock-tests',
      label: isEn ? 'Tests' : 'Đề thi',
      path: '/mock-tests',
      icon: FileText,
    },
    {
      id: 'more',
      label: isEn ? 'More' : 'Thêm',
      icon: Menu,
      isMore: true,
    },
  ];
};