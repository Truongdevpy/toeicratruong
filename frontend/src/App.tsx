import { BrandLogo } from './components/BrandLogo';
import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { ChatModal } from './components/ChatModal';
import { UserProfileModal } from './components/UserProfileModal';
import { FloatingChatButton } from './components/FloatingChatButton';
import { FloatingAITutor } from './components/FloatingAITutor';
import { MessageToast } from './components/MessageToast';
import { SelectionTranslator } from './components/SelectionTranslator';
import { RBACMatrixModal } from './components/RBACMatrixModal';
import { AuthRequiredGate } from './components/AuthRequiredGate';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuth } from './context/AuthContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { GeneralSettingsModal } from './components/GeneralSettingsModal';

// Eagerly loaded landing page
import { HomePage } from './pages/HomePage';

// Code-split lazy-loaded pages for high performance
const OnboardingPage = React.lazy(() => import('./pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })));
const PlacementTestPage = React.lazy(() => import('./pages/PlacementTestPage').then(m => ({ default: m.PlacementTestPage })));
const PlacementResultPage = React.lazy(() => import('./pages/PlacementResultPage').then(m => ({ default: m.PlacementResultPage })));
const LearningPathPage = React.lazy(() => import('./pages/LearningPathPage').then(m => ({ default: m.LearningPathPage })));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const PracticeHubPage = React.lazy(() => import('./pages/PracticeHubPage').then(m => ({ default: m.PracticeHubPage })));
const ListeningPracticePage = React.lazy(() => import('./pages/ListeningPracticePage').then(m => ({ default: m.ListeningPracticePage })));
const ReadingPracticePage = React.lazy(() => import('./pages/ReadingPracticePage').then(m => ({ default: m.ReadingPracticePage })));
const DictationPracticePage = React.lazy(() => import('./pages/DictationPracticePage').then(m => ({ default: m.DictationPracticePage })));
const FlashcardsPage = React.lazy(() => import('./pages/FlashcardsPage').then(m => ({ default: m.FlashcardsPage })));
const VocabularyPage = React.lazy(() => import('./pages/VocabularyPage').then(m => ({ default: m.VocabularyPage })));
const GrammarPage = React.lazy(() => import('./pages/GrammarPage').then(m => ({ default: m.GrammarPage })));
const AITutorPage = React.lazy(() => import('./pages/AITutorPage').then(m => ({ default: m.AITutorPage })));
const MockTestsPage = React.lazy(() => import('./pages/MockTestsPage').then(m => ({ default: m.MockTestsPage })));
const StatisticsPage = React.lazy(() => import('./pages/StatisticsPage').then(m => ({ default: m.StatisticsPage })));
const CommunityPage = React.lazy(() => import('./pages/CommunityPage').then(m => ({ default: m.CommunityPage })));
const AchievementsPage = React.lazy(() => import('./pages/AchievementsPage').then(m => ({ default: m.AchievementsPage })));
const AdminPage = React.lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })));
const LeaderboardPage = React.lazy(() => import('./pages/LeaderboardPage').then(m => ({ default: m.LeaderboardPage })));
const SpeakingPracticePage = React.lazy(() => import('./pages/SpeakingPracticePage').then(m => ({ default: m.SpeakingPracticePage })));
const WritingPracticePage = React.lazy(() => import('./pages/WritingPracticePage').then(m => ({ default: m.WritingPracticePage })));
const VideoLessonsPage = React.lazy(() => import('./pages/VideoLessonsPage').then(m => ({ default: m.VideoLessonsPage })));
const PaymentPage = React.lazy(() => import('./pages/PaymentPage').then(m => ({ default: m.PaymentPage })));

function AppContent() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname && window.location.pathname !== '/'
      ? window.location.pathname
      : '/';
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isRBACModalOpen, setIsRBACModalOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);

  const handleOpenRBAC = () => setIsRBACModalOpen(true);

  // Focus mode is controlled by active runners in child components
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAITutorOpen, setIsAITutorOpen] = useState(false);
  const [chatInitialUserId, setChatInitialUserId] = useState<number | null>(null);
  const [viewProfileUserId, setViewProfileUserId] = useState<number | null>(null);

  const handleOpenChat = (userId?: number | null) => {
    setIsAITutorOpen(false);
    setChatInitialUserId(userId || null);
    setIsChatOpen(true);
  };

  const handleToggleAITutor = () => {
    if (!isAITutorOpen) {
      setIsChatOpen(false);
    }
    setIsAITutorOpen((prev) => !prev);
  };

  const handleViewProfile = (userId: number) => {
    setViewProfileUserId(userId);
  };

  useEffect(() => {
    const handlePopState = () => {
      setIsFocusMode(false);
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const isGuestAllowedPath = (path: string) => {
    return path === '/' || path === '/practice/dictation' || path === '/dictation' || path === '/leaderboard' || path === '/community';
  };

  const handleProtectedNavigate = (path: string) => {
    if (!user && !isGuestAllowedPath(path)) {
      handleOpenAuth('login');
      return;
    }
    handleNavigate(path);
  };

  const handleNavigate = (path: string) => {
    setIsFocusMode(false);
    setCurrentPath(path);
    window.history.pushState({}, '', path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAuth = (tab: 'login' | 'register' = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };
  const renderCurrentPage = () => {
    const cleanPath = (currentPath.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/').toLowerCase();
    switch (cleanPath) {
      case '/':
        return <HomePage onNavigate={handleNavigate} onOpenAuth={handleOpenAuth} onOpenRBAC={handleOpenRBAC} />;

      case '/practice':
        if (!user) {
          return (
            <AuthRequiredGate
              featureName="Khu vực Luyện tập Kỹ năng (Practice Hub)"
              featureDesc="Học viên cần đăng nhập để mở khóa Luyện Nghe, Đọc, Viết, Nói, Từ vựng và Đề thi."
              onNavigate={handleNavigate}
              onOpenAuth={handleOpenAuth}
              onOpenRBAC={handleOpenRBAC}
            />
          );
        }
        return <PracticeHubPage onNavigate={handleNavigate} onOpenAuth={handleOpenAuth} onOpenRBAC={handleOpenRBAC} />;

      case '/practice/dictation':
      case '/dictation':
        // RBAC: Guest can view dictation list, but practicing prompts auth
        return <DictationPracticePage onNavigate={handleNavigate} onFocusModeChange={setIsFocusMode} onOpenAuth={handleOpenAuth} />;

      case '/leaderboard':
        // RBAC: Public Leaderboard
        return <LeaderboardPage onNavigate={handleNavigate} onOpenAuth={handleOpenAuth} onViewProfile={handleViewProfile} />;

      case '/community':
        // RBAC: Public Community Forum
        return <CommunityPage onNavigate={handleNavigate} onOpenChat={handleOpenChat} onViewProfile={handleViewProfile} onOpenAuth={handleOpenAuth} />;

      // GATED LEARNING MODULES: Require logged in user (Khách: ❌)
      case '/practice/listening':
      case '/listening':
        if (!user) {
          return (
            <AuthRequiredGate
              featureName="Luyện nghe (Listening Parts 1-4)"
              featureDesc="Luyện nghe 4 Parts chuẩn ETS với audio phòng thi, transcript song ngữ và chấm điểm AI."
              onNavigate={handleNavigate}
              onOpenAuth={handleOpenAuth}
              onOpenRBAC={handleOpenRBAC}
            />
          );
        }
        return <ListeningPracticePage onNavigate={handleNavigate} onFocusModeChange={(active) => setIsFocusMode(active)} onOpenAuth={handleOpenAuth} onOpenRBAC={handleOpenRBAC} />;

      case '/practice/reading':
      case '/reading':
        if (!user) {
          return (
            <AuthRequiredGate
              featureName="Luyện đọc (Reading Parts 5-7)"
              featureDesc="Luyện đọc chia đôi màn hình chuẩn thi thật, phân tích ngữ pháp và tra từ ngữ cảnh."
              onNavigate={handleNavigate}
              onOpenAuth={handleOpenAuth}
              onOpenRBAC={handleOpenRBAC}
            />
          );
        }
        return <ReadingPracticePage onNavigate={handleNavigate} onFocusModeChange={(active) => setIsFocusMode(active)} onOpenAuth={handleOpenAuth} onOpenRBAC={handleOpenRBAC} />;

      case '/practice/writing':
      case '/writing':
        if (!user) {
          return (
            <AuthRequiredGate
              featureName="Luyện viết (TOEIC Writing)"
              featureDesc="45 đề thi viết câu theo tranh, phản hồi email và bài luận 300+ từ với chấm điểm AI."
              onNavigate={handleNavigate}
              onOpenAuth={handleOpenAuth}
              onOpenRBAC={handleOpenRBAC}
            />
          );
        }
        return <WritingPracticePage onNavigate={handleNavigate} onFocusModeChange={setIsFocusMode} onOpenAuth={handleOpenAuth} onOpenRBAC={handleOpenRBAC} />;

      case '/practice/speaking':
      case '/speaking':
        if (!user) {
          return (
            <AuthRequiredGate
              featureName="Luyện nói (TOEIC Speaking)"
              featureDesc="45 đề thi nói đọc to văn bản, miêu tả tranh và trả lời câu hỏi kèm phòng thu âm."
              onNavigate={handleNavigate}
              onOpenAuth={handleOpenAuth}
              onOpenRBAC={handleOpenRBAC}
            />
          );
        }
        return <SpeakingPracticePage onNavigate={handleNavigate} onFocusModeChange={setIsFocusMode} onOpenAuth={handleOpenAuth} onOpenRBAC={handleOpenRBAC} />;

      case '/practice/vocabulary':
      case '/vocabulary':
        if (!user) {
          return (
            <AuthRequiredGate
              featureName="Kho Từ vựng theo lộ trình"
              featureDesc="5,000+ từ vựng cốt lõi phân theo band điểm, chủ đề thương mại và collocations thi thật."
              onNavigate={handleNavigate}
              onOpenAuth={handleOpenAuth}
              onOpenRBAC={handleOpenRBAC}
            />
          );
        }
        return <VocabularyPage onNavigate={handleNavigate} onFocusModeChange={setIsFocusMode} />;

      case '/practice/flashcards':
      case '/flashcards':
        if (!user) {
          return (
            <AuthRequiredGate
              featureName="Flashcards SRS Lặp lại ngắt quãng"
              featureDesc="Ghi nhớ từ vựng vĩnh viễn với thuật toán SuperMemo SM-2 và phát âm chuẩn IPA."
              onNavigate={handleNavigate}
              onOpenAuth={handleOpenAuth}
              onOpenRBAC={handleOpenRBAC}
            />
          );
        }
        return <FlashcardsPage onNavigate={handleNavigate} onFocusModeChange={setIsFocusMode} />;

      case '/practice/grammar':
      case '/grammar':
        if (!user) {
          return (
            <AuthRequiredGate
              featureName="Ngữ pháp TOEIC 38 chuyên đề"
              featureDesc="Lý thuyết từ loại, thì, mệnh đề quan hệ và bài tập phân tích bẫy đề thi ETS."
              onNavigate={handleNavigate}
              onOpenAuth={handleOpenAuth}
              onOpenRBAC={handleOpenRBAC}
            />
          );
        }
        return <GrammarPage onNavigate={handleNavigate} onFocusModeChange={setIsFocusMode} />;

      case '/videos':
      case '/video':
        if (!user) {
          return (
            <AuthRequiredGate
              featureName="Kho Video Bài giảng TOEIC"
              featureDesc="Video bài giảng thực chiến từ chuyên gia 990: bóc tách chiến thuật 7 Parts và mẹo ngữ pháp 5 giây."
              onNavigate={handleNavigate}
              onOpenAuth={handleOpenAuth}
              onOpenRBAC={handleOpenRBAC}
            />
          );
        }
        return <VideoLessonsPage onNavigate={handleNavigate} onOpenAuth={handleOpenAuth} onOpenRBAC={handleOpenRBAC} />;

      case '/mock-tests':
      case '/mock-test':
      case '/tests':
      case '/test':
        if (!user) {
          return (
            <AuthRequiredGate
              featureName="Kho Đề thi thử TOEIC"
              featureDesc="Thi thử 200 câu format chuẩn ETS với audio phòng thi, đồng hồ đếm ngược và chấm điểm tự động."
              onNavigate={handleNavigate}
              onOpenAuth={handleOpenAuth}
              onOpenRBAC={handleOpenRBAC}
            />
          );
        }
        return <MockTestsPage onNavigate={handleNavigate} onExamActiveChange={setIsFocusMode} onOpenAuth={handleOpenAuth} onOpenRBAC={handleOpenRBAC} />;

      case '/history':
      case '/history/tests':
      case '/history/questions':
        if (!user) {
          return (
            <AuthRequiredGate
              featureName="Lịch sử làm bài thi & câu hỏi"
              featureDesc="Xem lại chi tiết từng bài thi đã nộp, bảng điểm và các câu hỏi đã từng làm đúng/sai."
              onNavigate={handleNavigate}
              onOpenAuth={handleOpenAuth}
              onOpenRBAC={handleOpenRBAC}
            />
          );
        }
        return <MockTestsPage onNavigate={handleNavigate} onExamActiveChange={setIsFocusMode} initialTab="test_history" onOpenAuth={handleOpenAuth} onOpenRBAC={handleOpenRBAC} />;

      case '/dashboard':
        if (!user) {
          return (
            <AuthRequiredGate
              featureName="Bảng điều khiển học viên"
              featureDesc="Theo dõi mục tiêu điểm số, thời gian học tập hôm nay, chuỗi streak và lộ trình bài học."
              onNavigate={handleNavigate}
              onOpenAuth={handleOpenAuth}
              onOpenRBAC={handleOpenRBAC}
            />
          );
        }
        return <DashboardPage onNavigate={handleNavigate} />;

      case '/statistics':
        if (!user) {
          return (
            <AuthRequiredGate
              featureName="Thống kê & Phân tích điểm số"
              featureDesc="Biểu đồ tiến độ tăng điểm, tỷ lệ chính xác 7 Parts và gợi ý tối ưu thời gian học."
              onNavigate={handleNavigate}
              onOpenAuth={handleOpenAuth}
              onOpenRBAC={handleOpenRBAC}
            />
          );
        }
        return <StatisticsPage onNavigate={handleNavigate} />;

      case '/learning-path':
        if (!user) {
          return (
            <AuthRequiredGate
              featureName="Lộ trình học thích ứng AI"
              featureDesc="Kế hoạch học tập cá nhân hóa dựa trên band điểm đầu vào và mục tiêu điểm ra trường."
              onNavigate={handleNavigate}
              onOpenAuth={handleOpenAuth}
              onOpenRBAC={handleOpenRBAC}
            />
          );
        }
        return <LearningPathPage onNavigate={handleNavigate} />;

      case '/ai-tutor':
        if (!user) {
          return (
            <AuthRequiredGate
              featureName="Trợ lý Gia sư AI TOEIC"
              featureDesc="Hỏi đáp thắc mắc ngữ pháp, phân tích bẫy câu hỏi và làm mini-quiz củng cố 1-kèm-1."
              onNavigate={handleNavigate}
              onOpenAuth={handleOpenAuth}
              onOpenRBAC={handleOpenRBAC}
            />
          );
        }
        return <AITutorPage onNavigate={handleNavigate} />;

      case '/placement-test':
        if (!user) {
          return (
            <AuthRequiredGate
              featureName="Đánh giá năng lực TOEIC"
              featureDesc="Kiểm tra trình độ nhanh 20-30 phút để AI chẩn đoán điểm số và xếp lớp lộ trình chuẩn."
              onNavigate={handleNavigate}
              onOpenAuth={handleOpenAuth}
              onOpenRBAC={handleOpenRBAC}
            />
          );
        }
        return <PlacementTestPage onNavigate={handleNavigate} onFocusModeChange={setIsFocusMode} />;

      case '/placement-result':
      case '/placement-test/result':
        if (!user) {
          return (
            <AuthRequiredGate
              featureName="Kết quả Đánh giá năng lực"
              featureDesc="Xem phân tích chi tiết điểm mạnh, điểm yếu và gợi ý lộ trình học tập cá nhân hóa."
              onNavigate={handleNavigate}
              onOpenAuth={handleOpenAuth}
              onOpenRBAC={handleOpenRBAC}
            />
          );
        }
        return <PlacementResultPage onNavigate={handleNavigate} />;

      case '/achievements':
        if (!user) {
          return (
            <AuthRequiredGate
              featureName="Bộ sưu tập Huy hiệu & Thành tích"
              featureDesc="Ghi nhận nỗ lực học tập, chuỗi ngày liên tục và các cột mốc bứt phá điểm số."
              onNavigate={handleNavigate}
              onOpenAuth={handleOpenAuth}
              onOpenRBAC={handleOpenRBAC}
            />
          );
        }
        return <AchievementsPage onNavigate={handleNavigate} />;

      case '/onboarding':
        if (!user) {
          return (
            <AuthRequiredGate
              featureName="Cài đặt mục tiêu học tập"
              featureDesc="Cá nhân hóa mục tiêu điểm TOEIC và thời gian học mỗi ngày."
              onNavigate={handleNavigate}
              onOpenAuth={handleOpenAuth}
              onOpenRBAC={handleOpenRBAC}
            />
          );
        }
        return <OnboardingPage onNavigate={handleNavigate} />;
      case '/payment':
      case '/checkout':
      case '/pricing':
      case '/vip':
        return <PaymentPage onNavigate={handleNavigate} onOpenAuth={handleOpenAuth} />;
      case '/admin':
        if (user?.role !== 'admin') {
          return (
            <div className="min-h-[60vh] flex items-center justify-center p-6">
              <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/90 shadow-xl text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 font-bold text-xl">
                  403
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-slate-900">Khu vực dành riêng cho Quản trị viên</h2>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Bạn cần đăng nhập tài khoản Quản trị viên (Admin) để có quyền truy cập bảng điều khiển và hệ thống kiểm duyệt AI.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleNavigate('/dashboard')}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-xs cursor-pointer"
                  >
                    Về Dashboard học viên
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenAuth('login')}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
                  >
                    Đăng nhập tài khoản khác
                  </button>
                </div>
              </div>
            </div>
          );
        }
        return <AdminPage onNavigate={handleNavigate} />;
      default:
        return <HomePage onNavigate={handleNavigate} onOpenAuth={handleOpenAuth} />;
    }
  };

  const isPracticeOrExamMode = isFocusMode;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
      {/* Universal Navbar - Hidden during focused practice and exam mode */}
      {!isPracticeOrExamMode && (
        <Navbar
          currentPath={currentPath}
          onNavigate={handleProtectedNavigate}
          onOpenAuth={handleOpenAuth}
          onOpenChat={handleOpenChat}
          onOpenRBAC={handleOpenRBAC}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
        />
      )}

      {/* Main Page Area with ErrorBoundary & Lazy Suspense */}
      <main className="flex-1">
        <ErrorBoundary key={currentPath}>
          <React.Suspense fallback={
            <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3 py-16">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-semibold text-slate-500 animate-pulse">Đang tải nội dung...</p>
            </div>
          }>
            {renderCurrentPage()}
          </React.Suspense>
        </ErrorBoundary>
      </main>

      {/* Universal Footer - Hidden during focused exam mode */}
      {!isPracticeOrExamMode && (
        <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <BrandLogo variant="light" size="sm" showSubtitle={true} subtitle="Nền tảng luyện thi chuẩn ETS" />
            <p className="text-xs text-slate-400 leading-relaxed">
              Nền tảng luyện thi TOEIC ứng dụng AI cá nhân hóa lộ trình học, chẩn đoán lỗi sai và mô phỏng phòng thi chuẩn ETS.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Luyện tập</h4>
            <ul className="space-y-2 text-xs">
              <li><button onClick={() => handleProtectedNavigate('/practice/listening')} className="hover:text-white">Luyện nghe Parts 1-4</button></li>
              <li><button onClick={() => handleProtectedNavigate('/practice/reading')} className="hover:text-white">Luyện đọc Parts 5-7</button></li>
              <li><button onClick={() => handleNavigate('/practice/dictation')} className="hover:text-white">Chép chính tả (Dictation)</button></li>
              <li><button onClick={() => handleProtectedNavigate('/practice/speaking')} className="hover:text-white">Luyện nói (Speaking)</button></li>
              <li><button onClick={() => handleProtectedNavigate('/practice/writing')} className="hover:text-white">Luyện viết (Writing)</button></li>
              <li><button onClick={() => handleProtectedNavigate('/practice/flashcards')} className="hover:text-white">Flashcards SRS</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Tính năng AI</h4>
            <ul className="space-y-2 text-xs">
              <li><button onClick={() => handleProtectedNavigate('/learning-path')} className="hover:text-white">Lộ trình học thích ứng</button></li>
              <li><button onClick={() => handleProtectedNavigate('/ai-tutor')} className="hover:text-white">Gia sư AI cá nhân hóa</button></li>
              <li><button onClick={() => handleProtectedNavigate('/mock-tests')} className="hover:text-white">Đề thi Crack TOEIC Vol 2</button></li>
              <li><button onClick={() => handleProtectedNavigate('/statistics')} className="hover:text-white">Thống kê điểm số</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Tài khoản & Hệ thống</h4>
            <ul className="space-y-2 text-xs">
              <li><button onClick={() => handleOpenAuth('login')} className="hover:text-white">Đăng nhập học viên</button></li>
              <li><button onClick={() => handleOpenAuth('register')} className="hover:text-white">Đăng ký tài khoản</button></li>
              <li><button onClick={handleOpenRBAC} className="hover:text-amber-200 text-amber-400 font-bold flex items-center gap-1">👑 Quyền lợi gói học & VIP</button></li>
              <li><button onClick={() => handleNavigate('/leaderboard')} className="hover:text-white text-amber-300 font-semibold">Bảng xếp hạng thi đua</button></li>
              <li><button onClick={() => handleNavigate('/community')} className="hover:text-white">Cộng đồng học viên</button></li>
              {user?.role === 'admin' && (<li><button onClick={() => handleNavigate('/admin')} className="hover:text-white text-amber-400">Cổng Quản trị Admin</button></li>)}
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 mt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <div>© 2026 TOEIC Ra Trường Platform. All rights reserved.</div>
          <div className="mt-2 sm:mt-0 flex gap-4">
            <span className="hover:text-slate-400 cursor-pointer">Chính sách bảo mật</span>
            <span className="hover:text-slate-400 cursor-pointer">Điều khoản sử dụng</span>
            <span className="hover:text-slate-400 cursor-pointer">Quy chế thi ETS</span>
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className="hover:text-amber-400 text-slate-400 transition-colors cursor-pointer"
            >
              ⚙️ Cài đặt & Nút nổi
            </button>
          </div>
        </div>
      </footer>
      )}

      {/* Global Realtime Message Toast Popup */}
      {!isPracticeOrExamMode && (
        <MessageToast
          currentChatUserId={isChatOpen ? chatInitialUserId : null}
          onOpenConversation={(id) => handleOpenChat(id)}
        />
      )}

      {/* Global Floating AI Tutor (DeepTutor + Gemini Socratic) */}
      {!isPracticeOrExamMode && settings.showFloatingAITutor && (
        <ErrorBoundary fallbackTitle="Gia sư AI cá nhân hóa">
          <FloatingAITutor
            isOpen={isAITutorOpen}
            onToggle={handleToggleAITutor}
            onClose={() => setIsAITutorOpen(false)}
            onOpenAuth={handleOpenAuth}
            onNavigate={handleNavigate}
            showFloatingChat={settings.showFloatingChat}
          />
        </ErrorBoundary>
      )}

      {/* Global Floating Chat Button (Góc Dưới Bên Phải) */}
      {!isPracticeOrExamMode && settings.showFloatingChat && (
        <ErrorBoundary fallbackTitle="Nút tin nhắn">
          <FloatingChatButton
            isOpen={isChatOpen}
            onToggle={() => {
              if (!isChatOpen) {
                setIsAITutorOpen(false);
              }
              setIsChatOpen((prev) => !prev);
            }}
          />
        </ErrorBoundary>
      )}

      {/* Global Private Messaging Modal */}
      <ErrorBoundary fallbackTitle="Cửa sổ tin nhắn">
        <ChatModal
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          initialUserId={chatInitialUserId}
          onViewProfile={handleViewProfile}
          onOpenAuth={handleOpenAuth}
        />
      </ErrorBoundary>

      {/* Global User Public Profile Modal */}
      <UserProfileModal
        isOpen={Boolean(viewProfileUserId)}
        userId={viewProfileUserId}
        onClose={() => setViewProfileUserId(null)}
        onOpenChat={(targetUserId) => {
          setViewProfileUserId(null);
          handleOpenChat(targetUserId);
        }}
        onOpenRBAC={handleOpenRBAC}
        onNavigate={handleNavigate}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialTab={authModalTab}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          handleNavigate('/dashboard');
        }}
      />

      {/* Global RBAC Matrix & VIP Upgrade Modal */}
      <RBACMatrixModal
        isOpen={isRBACModalOpen}
        onClose={() => setIsRBACModalOpen(false)}
        onOpenAuth={handleOpenAuth}
        onNavigate={handleNavigate}
      />

      {/* Global General Settings Modal */}
      <GeneralSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onOpenRBAC={handleOpenRBAC}
      />

      {/* Global Selection Translator (Bôi Đen Để Dịch) */}
      <SelectionTranslator />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </AuthProvider>
  );
}
