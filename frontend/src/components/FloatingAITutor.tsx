import { formatDisplayTime } from '../utils/time';
import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Bot,
  Send,
  X,
  Maximize2,
  Minimize2,
  Brain,
  Target,
  AlertTriangle,
  RotateCcw,
  Plus,
  Trash2,
  HelpCircle,
  History,
  Settings,
  Check,
  Loader2,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface FloatingAITutorProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onOpenAuth?: (tab?: 'login' | 'register') => void;
  onNavigate?: (path: string) => void;
  showFloatingChat?: boolean;
}

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  action?: string;
  quiz?: {
    question: string;
    options: any;
    correct?: string;
    correct_answer?: string;
    explanation: string;
  };
  timestamp: string;
}

interface TutorConversation {
  id: number;
  title: string;
  created_at?: string;
  last_message?: string;
}

const COMMON_WEAK_AREAS = [
  'Part 1 (Tranh đồ vật)',
  'Part 2 (Bẫy lặp âm Echo)',
  'Part 3 (Hội thoại suy luận)',
  'Part 4 (Biểu đồ Graphic)',
  'Part 5 (Từ loại Word Form)',
  'Part 5 (Liên từ & Giới từ)',
  'Part 6 (Điền câu vào đoạn)',
  'Part 7 (Double/Triple Passages)',
];

export const normalizeWeakAreas = (raw: any): string[] => {
  if (!raw) return ['Part 5 (Từ loại Word Form)', 'Part 2 (Bẫy lặp âm Echo)'];
  if (Array.isArray(raw)) {
    const list = raw.map((x) => String(x || '').trim()).filter(Boolean);
    return list.length > 0 ? list : ['Part 5 (Từ loại Word Form)', 'Part 2 (Bẫy lặp âm Echo)'];
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          const list = parsed.map((x) => String(x || '').trim()).filter(Boolean);
          return list.length > 0 ? list : ['Part 5 (Từ loại Word Form)', 'Part 2 (Bẫy lặp âm Echo)'];
        }
      } catch {
        // Fallback to split
      }
    }
    const parts = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
    return parts.length > 0 ? parts : ['Part 5 (Từ loại Word Form)', 'Part 2 (Bẫy lặp âm Echo)'];
  }
  return ['Part 5 (Từ loại Word Form)', 'Part 2 (Bẫy lặp âm Echo)'];
};

export const FloatingAITutor: React.FC<FloatingAITutorProps> = ({
  isOpen,
  onToggle,
  onClose,
  onOpenAuth,
  onNavigate: _onNavigate,
  showFloatingChat = true
}) => {
  const { user, profile, refreshMe } = useAuth();

  const [activeTab, setActiveTab] = useState<'chat' | 'memory' | 'history'>('chat');
  const [isMaximized, setIsMaximized] = useState(false);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | undefined>(undefined);
  const [conversations, setConversations] = useState<TutorConversation[]>([]);
  const [selectedQuizAnswers, setSelectedQuizAnswers] = useState<Record<string, string>>({});

  // Cognitive Memory State (DeepTutor HKUDS)
  const [targetScore, setTargetScore] = useState<number>(() => Number(profile?.target_score) || 650);
  const [currentScore, setCurrentScore] = useState<number>(() => Number(profile?.current_score) || 450);
  const [weakAreas, setWeakAreas] = useState<string[]>(() => normalizeWeakAreas(profile?.weak_areas));
  const [aiMemoryNotes, setAiMemoryNotes] = useState<string>('');
  const [memorySaving, setMemorySaving] = useState(false);
  const [memorySavedNotice, setMemorySavedNotice] = useState(false);
  const [newWeakAreaInput, setNewWeakAreaInput] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (profile) {
      if (profile.target_score) setTargetScore(Number(profile.target_score) || 650);
      if (profile.current_score) setCurrentScore(Number(profile.current_score) || 450);
      if (profile.weak_areas) {
        setWeakAreas(normalizeWeakAreas(profile.weak_areas));
      }
    }
  }, [profile]);

  const loadMemoryData = async () => {
    try {
      const res = await api.getTutorMemory();
      if (res && res.status === 'success') {
        if (res.target_score) setTargetScore(Number(res.target_score) || 650);
        if (res.current_score) setCurrentScore(Number(res.current_score) || 450);
        if (res.weak_areas) setWeakAreas(normalizeWeakAreas(res.weak_areas));
        if (res.ai_memory_notes !== undefined) setAiMemoryNotes(String(res.ai_memory_notes || ''));
      }
    } catch {
      // Keep defaults
    }
  };

  const loadConversations = async () => {
    try {
      const res = await api.getTutorConversations();
      if (res && Array.isArray(res.conversations)) {
        setConversations(res.conversations);
      }
    } catch {
      // Fallback
    }
  };

  const initWelcomeMessage = () => {
    const safeList = normalizeWeakAreas(weakAreas);
    const weakList = safeList.length > 0 ? safeList.join(', ') : 'Part 5 & Part 2';
    setMessages([
      {
        id: 'msg-welcome',
        sender: 'ai',
        text: `Chào ${user?.full_name || 'bạn'}! Tôi là **Gia sư AI cá nhân hóa** - Trợ lý học tập 1-1 đồng hành cùng bạn chinh phục TOEIC.\n\n🎯 **Hồ sơ nhận thức học tập:**\n- Mục tiêu: **${targetScore} TOEIC** (Hiện tại: **${currentScore}**)\n- Trọng tâm cần khắc phục: **${weakList}**\n\n💡 Tôi áp dụng **phương pháp gợi mở Socratic** và **mẹo nhận biết 5 giây ETS** để giúp bạn hiểu bản chất bẫy đề thay vì chỉ nhìn đáp án. Bạn muốn ôn luyện chủ điểm nào ngay bây giờ?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  useEffect(() => {
    if (user) {
      loadMemoryData();
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    if (messages.length === 0) {
      initWelcomeMessage();
    }
  }, [targetScore, weakAreas, user]);

  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, isOpen, activeTab]);


  const handleSendMessage = async (textToSend?: string, actionType?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      action: actionType,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setLoading(true);

    try {
      const res = await api.chatWithTutor({
        message: text.trim(),
        action: actionType,
        conversation_id: conversationId
      });

      if (res && res.conversation_id && !conversationId) {
        setConversationId(res.conversation_id);
        loadConversations();
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: res?.reply || 'Tôi đã tiếp nhận câu hỏi của bạn. Cùng phân tích bẫy đề ETS nhé!',
        action: res?.action,
        quiz: res?.quiz || (res?.quiz_data && res.quiz_data[0]),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errMsg = err?.message || '';
      let simulatedReply = '';

      if (errMsg.includes('403') || errMsg.includes('giới hạn')) {
        simulatedReply = '⚠️ Tài khoản gói thường giới hạn 3 lượt hỏi AI mỗi ngày. Nâng cấp VIP Pro để hỏi Gia sư AI cá nhân hóa không giới hạn!';
      } else {
        simulatedReply = `Về chủ điểm "${text}":\n\n💡 **Mẹo Socratic Gia sư AI 5s:**\n- Trong Part 5 & 6 TOEIC, luôn xác định **vị trí chỗ trống** (đứng sau giới từ, liên từ hay động từ chính).\n- Loại trừ ngay các phương án gây nhiễu cùng gốc từ nhưng sai hậu tố (suffixes).\n\n👉 Bạn muốn thử sức ngay với 1 câu hỏi kiểm tra nhanh dạng này không?`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: simulatedReply,
          quiz: actionType === 'quiz' ? {
            question: 'The newly hired director is expected ________ the quarterly productivity report by Friday.',
            options: {
              A: 'to submit',
              B: 'submitting',
              C: 'submit',
              D: 'submission'
            },
            correct: 'A',
            explanation: 'Cấu trúc "be expected to V-infinitive" (được kỳ vọng sẽ làm gì).'
          } : undefined,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMemory = async () => {
    setMemorySaving(true);
    try {
      const safeList = normalizeWeakAreas(weakAreas);
      await api.updateTutorMemory({
        target_score: targetScore,
        weak_areas: safeList,
        ai_memory_notes: aiMemoryNotes
      });
      setMemorySavedNotice(true);
      setTimeout(() => setMemorySavedNotice(false), 3000);
      if (refreshMe) {
        refreshMe();
      }
    } catch {
      alert('Không thể lưu cài đặt trí nhớ Gia sư AI. Vui lòng thử lại!');
    } finally {
      setMemorySaving(false);
    }
  };

  const handleResetMemory = async () => {
    if (!confirm('Bạn có chắc muốn đặt lại toàn bộ ghi chú và trí nhớ Gia sư AI về mặc định?')) return;
    try {
      await api.resetTutorMemory();
      setAiMemoryNotes('');
      setWeakAreas(['Part 5 (Từ loại Word Form)', 'Part 2 (Bẫy lặp âm Echo)']);
      setTargetScore(650);
      alert('Đã khôi phục trí nhớ Gia sư AI về mặc định.');
    } catch {
      alert('Có lỗi khi đặt lại trí nhớ.');
    }
  };

  const handleToggleWeakArea = (area: string) => {
    setWeakAreas((prev) => {
      const current = normalizeWeakAreas(prev);
      return current.includes(area)
        ? current.filter((a) => a !== area)
        : [...current, area];
    });
  };

  const handleAddCustomWeakArea = () => {
    if (!newWeakAreaInput.trim()) return;
    const trimmed = newWeakAreaInput.trim();
    setWeakAreas((prev) => {
      const current = normalizeWeakAreas(prev);
      return current.includes(trimmed) ? current : [...current, trimmed];
    });
    setNewWeakAreaInput('');
  };

  const handleStartNewConversation = async () => {
    try {
      const res = await api.createTutorConversation('Hội thoại mới');
      if (res && res.conversation) {
        setConversationId(res.conversation.id);
        setConversations((prev) => [res.conversation, ...(Array.isArray(prev) ? prev : [])]);
      }
    } catch {
      setConversationId(undefined);
    }
    initWelcomeMessage();
    setSelectedQuizAnswers({});
    setActiveTab('chat');
  };

  const handleSelectConversation = async (conv: TutorConversation) => {
    setConversationId(conv.id);
    setActiveTab('chat');
    try {
      const res = await api.getTutorMessages(conv.id);
      if (res && Array.isArray(res.messages) && res.messages.length > 0) {
        const loaded: ChatMessage[] = res.messages.map((m: any) => ({
          id: `db-${m.id}`,
          sender: m.sender,
          text: m.content || '',
          action: m.prompt_action,
          quiz: m.quiz || (m.quiz_data && m.quiz_data[0]),
          timestamp: m.created_at ? formatDisplayTime(undefined, m.created_at) : 'Vừa xong'
        }));
        setMessages(loaded);
      } else {
        setMessages([
          {
            id: `conv-head-${conv.id}`,
            sender: 'ai',
            text: `Tiếp tục thảo luận phiên: **${conv.title}**. Bạn muốn Gia sư AI giải thích chủ điểm nào tiếp theo?`,
            timestamp: 'Vừa xong'
          }
        ]);
      }
    } catch {
      // Fallback
    }
  };

  const handleDeleteConversation = async (e: React.MouseEvent, convId: number) => {
    e.stopPropagation();
    if (!confirm('Xóa cuộc trò chuyện này?')) return;
    try {
      await api.deleteTutorConversation(convId);
      setConversations((prev) => (Array.isArray(prev) ? prev.filter((c) => c.id !== convId) : []));
      if (conversationId === convId) {
        setConversationId(undefined);
        initWelcomeMessage();
      }
    } catch {
      alert('Không thể xóa cuộc trò chuyện');
    }
  };

  const handleQuizAnswer = (msgId: string, choiceLetter: string) => {
    setSelectedQuizAnswers((prev) => ({ ...prev, [msgId]: choiceLetter }));
  };

  const quickPrompts = [
    { label: '💡 Mẹo 5s Part 5', action: 'explain_simpler', text: 'Hãy chia sẻ mẹo nhận diện từ loại 5s trong Part 5 ETS' },
    { label: '🎯 Bẫy đề Part 2', action: 'mistake_analysis', text: 'Phân tích các bẫy lặp từ và câu trả lời gián tiếp trong Part 2' },
    { label: '📝 Tạo mini-quiz', action: 'quiz', text: 'Tạo cho tôi 1 câu hỏi mini-quiz Part 5 kèm 4 đáp án A B C D' },
    { label: '🔍 Kỹ thuật Part 7', action: 'give_examples', text: 'Hướng dẫn kỹ thuật Scan & Skim tìm dẫn chứng cho đoạn văn kép Part 7' }
  ];
  // If floating window is closed, render the floating trigger button
  if (!isOpen) {
    return (
      <aside aria-label="Gia sư AI cá nhân hóa" className={`fixed bottom-4 ${showFloatingChat ? 'right-32 sm:right-36' : 'right-4 sm:right-6'} sm:bottom-6 z-[8000] print:hidden transition-all duration-200`}>
        <button
          type="button"
          onClick={onToggle}
          className="group relative flex items-center gap-2 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-700 hover:via-indigo-700 hover:to-blue-700 text-white font-bold text-sm px-4 py-2.5 rounded-full shadow-lg shadow-indigo-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer select-none"
          title="Mở Gia sư AI cá nhân hóa & Trí nhớ học tập"
        >
          <div className="relative flex items-center justify-center w-6 h-6 rounded-lg bg-white/20 backdrop-blur-xs">
            <Bot className="w-4 h-4 text-white transition-transform group-hover:scale-110" />
            <Sparkles className="w-2.5 h-2.5 text-amber-300 absolute -top-1 -right-1" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-indigo-600 animate-pulse" />
          </div>
          <span className="tracking-wide hidden sm:inline">Gia sư AI cá nhân hóa</span>
          <span className="tracking-wide sm:hidden">Gia sư AI</span>
        </button>
      </aside>
    );
  }

  const safeWeakAreas = normalizeWeakAreas(weakAreas);

  // Floating Window is OPEN
  return (
    <div
      aria-label="Cửa sổ Gia sư AI cá nhân hóa"
      className={`fixed z-[8550] print:hidden transition-all duration-200 ease-out flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden ${
        isMaximized
          ? 'bottom-2 left-2 right-2 top-14 sm:left-auto sm:top-auto sm:bottom-6 sm:right-6 sm:w-[760px] sm:h-[86vh] sm:max-h-[820px]'
          : 'bottom-3 right-3 left-3 sm:left-auto sm:bottom-6 sm:right-6 w-auto sm:w-[450px] h-[620px] max-h-[calc(100vh-70px)]'
      }`}
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-indigo-900/40 select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-md shrink-0 text-white font-bold cursor-pointer hover:scale-105 transition-transform"
            title="Màn hình trò chuyện"
          >
            <Bot className="w-5 h-5" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900 ring-1 ring-white/50" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold truncate text-white tracking-wide">Gia sư AI cá nhân hóa</h3>
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 shrink-0">
                Socratic 1-1
              </span>
            </div>
            <p className="text-[11px] text-slate-300 truncate flex items-center gap-1">
              <span>Học tập thích ứng</span>
              <span>•</span>
              <span className="text-amber-300 font-medium">🎯 Mục tiêu {targetScore} TOEIC</span>
            </p>
          </div>
        </div>

        {/* Window controls & Setting / History buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* New chat button */}
          <button
            type="button"
            onClick={handleStartNewConversation}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Tạo cuộc trò chuyện mới"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* History button */}
          <button
            type="button"
            onClick={() => setActiveTab((prev) => (prev === 'history' ? 'chat' : 'history'))}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer relative ${
              activeTab === 'history'
                ? 'text-white bg-indigo-600 shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Lịch sử các phiên học"
          >
            <History className="w-4 h-4" />
            {conversations.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-indigo-400" />
            )}
          </button>

          {/* Setting icon button (Trí nhớ AI & Phong cách học) */}
          <button
            type="button"
            onClick={() => setActiveTab((prev) => (prev === 'memory' ? 'chat' : 'memory'))}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer relative ${
              activeTab === 'memory'
                ? 'text-white bg-violet-600 shadow-xs ring-2 ring-violet-400/40'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Cài đặt Trí nhớ & Phong cách học"
          >
            <Settings className="w-4 h-4" />
            {aiMemoryNotes && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-violet-400 ring-1 ring-slate-900" />
            )}
          </button>

          {/* Maximize / Restore */}
          <button
            type="button"
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title={isMaximized ? 'Thu nhỏ' : 'Phóng to'}
          >
            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-rose-500/20 hover:text-rose-300 rounded-lg transition-colors cursor-pointer"
            title="Đóng trợ lý"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
        {/* VIEW 1: CHAT */}
        {activeTab === 'chat' && (
          <>
            {/* Cognitive Context Strip with Settings link */}
            <div className="px-3 py-1.5 bg-indigo-50/70 border-b border-indigo-100 flex items-center justify-between text-[11px] text-indigo-900 shrink-0">
              <div className="flex items-center gap-1.5 truncate">
                <Brain className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate">
                  Trí nhớ: <b>{targetScore}đ</b> • Yếu: <b>{safeWeakAreas.slice(0, 2).join(', ')}</b>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('memory')}
                className="text-indigo-600 hover:text-indigo-800 font-bold shrink-0 ml-1 flex items-center gap-1 cursor-pointer hover:underline"
                title="Mở Cài đặt Trí nhớ"
              >
                <Settings className="w-3 h-3 text-indigo-600" />
                <span>Cài đặt</span>
              </button>
            </div>

            {/* Quick Action Chips */}
            <div className="px-3 py-2 bg-white border-b border-slate-200/80 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
              {quickPrompts.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(q.text, q.action)}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200/90 hover:border-indigo-300 transition-all shrink-0 cursor-pointer whitespace-nowrap active:scale-95"
                >
                  {q.label}
                </button>
              ))}
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5">
              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                        isUser
                          ? 'bg-blue-600 text-white'
                          : 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-xs'
                      }`}
                    >
                      {isUser ? user?.full_name?.charAt(0) || 'U' : <Bot className="w-4 h-4" />}
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl p-3 text-xs sm:text-[13px] leading-relaxed space-y-2 ${
                        isUser
                          ? 'bg-blue-600 text-white rounded-tr-none shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-xs'
                      }`}
                    >
                      <div className="whitespace-pre-line">
                        {(msg.text || '').split('\n\n').map((para, pIdx) => (
                          <p key={pIdx} className="mb-1.5 last:mb-0">
                            {para}
                          </p>
                        ))}
                      </div>

                      {/* Embedded Interactive Quiz */}
                      {msg.quiz && (
                        <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-indigo-200/90 space-y-2 text-slate-900">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                            <HelpCircle className="w-3.5 h-3.5" /> Mini-Quiz Kiểm Tra Nhanh
                          </div>
                          <p className="font-bold text-xs text-slate-900">{msg.quiz.question}</p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {(() => {
                              const rawOpts = msg.quiz.options;
                              const optEntries: [string, string][] = Array.isArray(rawOpts)
                                ? rawOpts.map((o: string) => [o.charAt(0), o])
                                : typeof rawOpts === 'object' && rawOpts !== null
                                ? Object.entries(rawOpts).map(([k, v]) => [k, `${k}. ${v}`])
                                : [];

                              const correctLetter = (msg.quiz.correct || msg.quiz.correct_answer || '').toUpperCase();
                              const selected = selectedQuizAnswers[msg.id];

                              return optEntries.map(([letter, label]) => {
                                const cleanLetter = letter.toUpperCase();
                                const isSelected = selected === cleanLetter;
                                let btnStyle = 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100';

                                if (selected) {
                                  if (cleanLetter === correctLetter) {
                                    btnStyle = 'bg-emerald-50 border-emerald-400 text-emerald-800 font-bold';
                                  } else if (isSelected) {
                                    btnStyle = 'bg-rose-50 border-rose-400 text-rose-800';
                                  }
                                }

                                return (
                                  <button
                                    key={cleanLetter}
                                    type="button"
                                    onClick={() => handleQuizAnswer(msg.id, cleanLetter)}
                                    className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${btnStyle}`}
                                  >
                                    {label}
                                  </button>
                                );
                              });
                            })()}
                          </div>

                          {selectedQuizAnswers[msg.id] && msg.quiz.explanation && (
                            <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-600 bg-white p-2 rounded-lg">
                              <p className="font-bold text-indigo-700 mb-0.5">💡 Giải thích Socratic:</p>
                              <p>{msg.quiz.explanation}</p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className={`text-[10px] text-right ${isUser ? 'text-blue-100' : 'text-slate-400'}`}>
                        {msg.timestamp}
                      </div>
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-indigo-700 bg-indigo-50/80 p-2.5 rounded-xl border border-indigo-100 animate-pulse w-fit">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  <span>Gia sư AI đang phân tích câu hỏi & soạn gợi ý...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="p-3 bg-white border-t border-slate-200 shrink-0">
              {!user && (
                <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center justify-between">
                  <span>Đăng nhập để lưu lịch sử và kích hoạt toàn diện Trí nhớ AI</span>
                  {onOpenAuth && (
                    <button
                      type="button"
                      onClick={() => onOpenAuth('login')}
                      className="font-bold underline text-amber-900 ml-2"
                    >
                      Đăng nhập
                    </button>
                  )}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Hỏi Gia sư AI về ngữ pháp, từ vựng, bẫy Part 1-7..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-xs text-slate-800 outline-none transition-all placeholder:text-slate-400"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || loading}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                  title="Gửi câu hỏi"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        )}
        {/* VIEW 2: SETTINGS (Trí Nhớ Nhận Thức & Phong Cách Học) - Only shown when clicking ⚙️ */}
        {activeTab === 'memory' && (
          <div className="flex-1 flex flex-col min-h-0 bg-white">
            {/* Settings Top Bar */}
            <div className="px-4 py-2.5 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between shrink-0 select-none">
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại trò chuyện</span>
              </button>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Settings className="w-3.5 h-3.5 text-violet-600" />
                <span>Cài đặt Trí nhớ Gia sư AI</span>
              </div>
            </div>

            {/* Settings Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-indigo-100 space-y-1.5">
                <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                  <Brain className="w-4 h-4 text-violet-600" />
                  <span>Hệ thống Trí nhớ Nhận thức & Cá nhân hóa</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Gia sư AI cá nhân hóa tự động ghi nhớ mục tiêu điểm số, các lỗ hổng kiến thức và phong cách giải thích bạn mong muốn vào mỗi lời nhắc của Gemini API. Mọi phản hồi đều được tối ưu riêng cho bạn.
                </p>
              </div>

              {memorySavedNotice && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center justify-between animate-fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Đã lưu cài đặt trí nhớ thành công!</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('chat')}
                    className="text-xs font-bold text-emerald-700 underline hover:text-emerald-900 cursor-pointer"
                  >
                    Về trò chuyện →
                  </button>
                </div>
              )}

              {/* Target Score */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-indigo-600" /> Mục tiêu điểm TOEIC:
                  </span>
                  <span className="text-indigo-700 font-extrabold">{targetScore} TOEIC</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[450, 550, 650, 750, 850, 990].map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setTargetScore(score)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        targetScore === score
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weak Areas */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Chủ điểm cần ưu tiên củng cố (Lỗ hổng kiến thức):</span>
                </label>

                <div className="flex flex-wrap gap-1.5">
                  {COMMON_WEAK_AREAS.map((area) => {
                    const active = safeWeakAreas.includes(area);
                    return (
                      <button
                        key={area}
                        type="button"
                        onClick={() => handleToggleWeakArea(area)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          active
                            ? 'bg-rose-50 text-rose-700 border border-rose-300 font-bold'
                            : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {active ? '✓ ' : '+ '}
                        {area}
                      </button>
                    );
                  })}
                </div>

                {/* Add custom weak area */}
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    value={newWeakAreaInput}
                    onChange={(e) => setNewWeakAreaInput(e.target.value)}
                    placeholder="Thêm chủ điểm khác (vd: Rút gọn mệnh đề quan hệ)..."
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 outline-none focus:border-indigo-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomWeakArea();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomWeakArea}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg text-xs font-bold border border-slate-200 cursor-pointer"
                  >
                    Thêm
                  </button>
                </div>
              </div>

              {/* Custom DeepTutor Prompt Notes */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-violet-600" />
                  <span>Ghi chú phong cách giảng dạy cá nhân hóa:</span>
                </label>
                <textarea
                  rows={3}
                  value={aiMemoryNotes}
                  onChange={(e) => setAiMemoryNotes(e.target.value)}
                  placeholder="Ví dụ: Tôi muốn được hỏi câu gợi mở trước khi cho đáp án, luôn nhấn mạnh bẫy ETS và các từ đồng âm hay nhầm lẫn..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 placeholder:text-slate-400"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSaveMemory}
                  disabled={memorySaving}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {memorySaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Lưu Cài Đặt Trí Nhớ</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetMemory}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  title="Đặt lại mặc định"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: CONVERSATION HISTORY - Only shown when clicking 🕒 */}
        {activeTab === 'history' && (
          <div className="flex-1 flex flex-col min-h-0 bg-white">
            {/* History Top Bar */}
            <div className="px-4 py-2.5 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between shrink-0 select-none">
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại trò chuyện</span>
              </button>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <History className="w-3.5 h-3.5 text-slate-500" />
                <span>Phiên học đã lưu</span>
              </div>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500">
                  Tổng cộng: <b>{conversations.length}</b> phiên
                </span>
                <button
                  type="button"
                  onClick={handleStartNewConversation}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Tạo phiên mới
                </button>
              </div>

              {conversations.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs space-y-2">
                  <History className="w-8 h-8 mx-auto text-slate-300" />
                  <p>Chưa có phiên trò chuyện nào.</p>
                  <button
                    type="button"
                    onClick={handleStartNewConversation}
                    className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Bắt đầu hội thoại ngay
                  </button>
                </div>
              ) : (
                conversations.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectConversation(c)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      conversationId === c.id
                        ? 'bg-indigo-50/80 border-indigo-300 text-indigo-900 font-semibold'
                        : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs truncate font-bold">{c.title}</div>
                      {c.last_message && (
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {c.last_message}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteConversation(e, c.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors shrink-0 cursor-pointer"
                      title="Xóa hội thoại"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
