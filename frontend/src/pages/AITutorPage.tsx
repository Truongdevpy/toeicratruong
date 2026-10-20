import { AuthRequiredGate } from '../components/AuthRequiredGate';
import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  Target,
  Flame,
  BookOpen,
  MessageSquare,
  Plus,
  HelpCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface AITutorPageProps {
  onNavigate: (path: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  action?: string;
  quiz?: {
    question: string;
    options: any;
    correct: string;
    explanation: string;
  };
  timestamp: string;
}

export const AITutorPage: React.FC<AITutorPageProps> = ({ onNavigate }) => {
  const { user, profile } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | undefined>(undefined);
  const [conversations, setConversations] = useState<{ id: number; title: string; date: string }[]>([]);
  const [selectedQuizAnswers, setSelectedQuizAnswers] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = async () => {
    try {
      const res = await api.getTutorConversations();
      if (res && res.conversations) {
        setConversations(res.conversations);
      } else {
        setConversations([
          { id: 1, title: 'Hỏi đáp thì hiện tại hoàn thành', date: 'Hôm nay' },
          { id: 2, title: 'Bẫy đề thi Part 7 Double Passages', date: 'Hôm qua' },
          { id: 3, title: 'Chiến thuật nghe số & thời gian Part 2', date: '3 ngày trước' },
        ]);
      }
    } catch {
      // Fallback
    }
  };

  const initGreeting = () => {
    const target = profile?.target_score || 650;
    const current = profile?.current_score || 450;
    const safeList = Array.isArray(profile?.weak_areas) ? profile.weak_areas : (typeof profile?.weak_areas === 'string' ? [profile.weak_areas] : []);
    const weakList = safeList.length > 0 ? safeList.join(', ') : 'Part 3 (Hội thoại) và Part 5 (Từ loại)';
    
    setMessages([
      {
        id: 'msg-welcome',
        sender: 'ai',
        text: `Chào bạn! Tôi là **Gia sư AI cá nhân hóa**, trợ lý học tập 1-kèm-1 của bạn. 🎯\n\nHệ thống ghi nhận mục tiêu của bạn là **${target} TOEIC** (hiện tại: **${current}**). Điểm yếu cần ưu tiên cải thiện: **${weakList}**.\n\nTôi có thể giúp bạn giải đáp ngữ pháp, phân tích bẫy đề thi, giải bài tập khó hoặc tạo câu đố trắc nghiệm ngay bây giờ. Bạn muốn bắt đầu với phần nào?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };


  useEffect(() => {
    if (!user) return;
    loadConversations();
    initGreeting();
  }, [user, profile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);


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
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: res?.reply || 'Tôi đã tiếp nhận câu hỏi của bạn. Hãy cùng phân tích các điểm quan trọng trong đề thi TOEIC nhé!',
        action: res?.action,
        quiz: res?.quiz || (res?.quiz_data && res.quiz_data[0]),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      // Graceful AI response simulation if offline
      setTimeout(() => {
        let simulatedReply = `Về thắc mắc "${text}":\n\nTrong bài thi TOEIC, đây là chủ điểm thường xuyên xuất hiện ở **Part 5 & Part 6**.\n\n👉 **Quy tắc vàng:** Luôn xác định động từ chính của mệnh đề trước khi chọn thì hoặc dạng từ. Nếu câu đã có động từ chia thì đầy đủ, vị trí trống có thể là rút gọn mệnh đề quan hệ (V-ing/V-ed) hoặc trạng từ (adv) bổ nghĩa.`;
        let quizItem: any = undefined;

        if (actionType === 'quiz' || text.toLowerCase().includes('bài tập')) {
          quizItem = {
            question: 'The management team is considering ________ the marketing conference until next quarter.',
            options: ['A. to postpone', 'B. postponing', 'C. postponed', 'D. postponement'],
            correct: 'B',
            explanation: 'Động từ "consider" đi kèm danh động từ (V-ing) -> "considering postponing".'
          };
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            sender: 'ai',
            text: simulatedReply,
            quiz: quizItem,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }, 700);
    } finally {
      setLoading(false);
    }
  };

  const quickActionChips = [
    { label: 'Giải thích đơn giản', action: 'explain_simpler', icon: Lightbulb },
    { label: 'Cho ví dụ thực tế ETS', action: 'give_examples', icon: BookOpen },
    { label: 'Tạo bài tập kiểm tra', action: 'quiz', icon: HelpCircle },
    { label: 'Phân tích bẫy lỗi sai', action: 'mistake_analysis', icon: AlertTriangle },
  ];

  const suggestedQuestions = [
    'Phân biệt During, While và For trong Part 5',
    'Làm thế nào để tránh bẫy từ đồng âm trong Part 2?',
    'Cách làm dạng câu hỏi ngụ ý (Inference) Part 7',
    'Phân biệt thể Chủ động và Bị động rút gọn'
  ];

  const handleStartNewChat = () => {
    setConversationId(undefined);
    initGreeting();
    setSelectedQuizAnswers({});
  };

  const handleQuizAnswer = (msgId: string, choiceLetter: string) => {
    setSelectedQuizAnswers((prev) => ({ ...prev, [msgId]: choiceLetter }));
  };

  if (!user) {
    return (
      <AuthRequiredGate
        featureName="Gia sư AI cá nhân hóa"
        featureDesc="Hỏi đáp thắc mắc ngữ pháp, phân tích bẫy câu hỏi và làm mini-quiz củng cố 1-kèm-1."
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-120px)] min-h-[640px]">
          
          {/* Left Column: Profile Awareness & Conversation History */}
          <div className="hidden lg:flex lg:col-span-3 flex-col gap-4">
            
            {/* Student Persona / Diagnostics Card */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Trợ Lý Nhận Diện Hồ Sơ</h3>
                  <p className="text-[11px] text-slate-500">AI thích ứng trình độ người học</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-blue-600" /> Mục tiêu:
                  </span>
                  <span className="font-bold text-blue-700">{profile?.target_score || 650} TOEIC</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" /> Hiện tại:
                  </span>
                  <span className="font-bold text-slate-800">{profile?.current_score || 450} TOEIC</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-500" /> Chuỗi học:
                  </span>
                  <span className="font-bold text-amber-600">{profile?.streak_days ?? 0} ngày</span>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Vùng yếu cần cải thiện
                </div>
                <div className="flex flex-wrap gap-1">
                  {(Array.isArray(profile?.weak_areas) && profile.weak_areas.length > 0
                    ? profile.weak_areas
                    : ['Part 3 Graphic', 'Part 5 Word Form', 'Part 7 Double Passages']
                  ).map((area, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-100"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Past Conversations List */}
            <div className="bg-white flex-1 rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" /> Hội thoại gần đây
                </h4>
                <button
                  onClick={handleStartNewChat}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                  title="Tạo hội thoại mới"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setConversationId(c.id);
                      setMessages([
                        {
                          id: `hist-${c.id}`,
                          sender: 'ai',
                          text: `Tiếp tục thảo luận về: **${c.title}**. Bạn muốn ôn tập lại các ví dụ hay làm câu hỏi kiểm tra nhanh?`,
                          timestamp: 'Vừa xong'
                        }
                      ]);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors flex flex-col gap-0.5 ${
                      conversationId === c.id
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{c.title}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{c.date}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={handleStartNewChat}
                className="mt-3 w-full py-2 px-3 rounded-xl border border-dashed border-slate-300 text-slate-600 text-xs font-semibold hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/50 transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Hội thoại mới
              </button>
            </div>
          </div>

          {/* Right Column: Chat Window */}
          <div className="lg:col-span-9 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col h-full overflow-hidden">
            
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Bot className="w-5 h-5" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900">Gia sư AI cá nhân hóa</h2>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                      Đang trực tuyến
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Phản hồi theo ngữ cảnh & mục tiêu {profile?.target_score || 650} điểm của bạn
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('/learning-path')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 flex items-center gap-1 transition-colors"
                >
                  Xem lộ trình <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Action Prompt Chips */}
            <div className="px-6 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2 overflow-x-auto shrink-0">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Tác vụ nhanh:
              </span>
              {quickActionChips.map((chip) => {
                const Icon = chip.icon;
                return (
                  <button
                    key={chip.action}
                    onClick={() => handleSendMessage(`Yêu cầu AI: ${chip.label}`, chip.action)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/40 transition-colors shrink-0 shadow-2xs cursor-pointer"
                  >
                    <Icon className="w-3.5 h-3.5 text-blue-600" />
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                        isUser
                          ? 'bg-blue-600 text-white'
                          : 'bg-gradient-to-tr from-indigo-600 to-blue-600 text-white shadow-2xs'
                      }`}
                    >
                      {isUser ? user?.full_name?.charAt(0) || 'U' : <Bot className="w-4 h-4" />}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`max-w-[82%] rounded-2xl p-4 text-xs sm:text-sm space-y-3 leading-relaxed ${
                        isUser
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-slate-50 border border-slate-200/70 text-slate-800 rounded-tl-none'
                      }`}
                    >
                      <div className="whitespace-pre-line font-normal">
                        {msg.text.split('\n\n').map((para, pIdx) => (
                          <p key={pIdx} className="mb-2 last:mb-0">
                            {para}
                          </p>
                        ))}
                      </div>

                      {/* Interactive Quiz embedded in AI message */}
                      {msg.quiz && (
                        <div className="mt-3 p-4 rounded-xl bg-white border border-blue-200/80 shadow-2xs space-y-3 text-slate-900">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 uppercase tracking-wider">
                            <HelpCircle className="w-4 h-4" /> Câu hỏi kiểm tra tức thì
                          </div>
                          <p className="font-bold text-xs sm:text-sm text-slate-900">{msg.quiz.question}</p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(() => {
                              const rawOpts = msg.quiz.options;
                              const optList: string[] = Array.isArray(rawOpts)
                                ? rawOpts
                                : typeof rawOpts === 'object' && rawOpts !== null
                                ? Object.entries(rawOpts).map(([k, v]) => `${k}. ${v}`)
                                : [];

                              return optList.map((opt) => {
                                const letter = opt.substring(0, 1).toUpperCase();
                                const answered = selectedQuizAnswers[msg.id];
                                const isChoice = answered === letter;
                                let btnClass = 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100';

                                if (answered) {
                                  if (letter === msg.quiz!.correct?.toUpperCase()) {
                                    btnClass = 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold';
                                  } else if (isChoice) {
                                    btnClass = 'bg-rose-50 border-rose-400 text-rose-900';
                                  }
                                }

                                return (
                                  <button
                                    key={opt}
                                    onClick={() => handleQuizAnswer(msg.id, letter)}
                                    className={`p-2.5 rounded-lg border text-left text-xs transition-all cursor-pointer ${btnClass}`}
                                  >
                                    {opt}
                                  </button>
                                );
                              });
                            })()}
                          </div>

                          {selectedQuizAnswers[msg.id] && (
                            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-900 space-y-1">
                              <div className="font-bold flex items-center gap-1">
                                {selectedQuizAnswers[msg.id] === msg.quiz.correct ? (
                                  <span className="text-emerald-700 flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Chính xác!
                                  </span>
                                ) : (
                                  <span className="text-rose-700 flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5" /> Chưa chính xác!
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-700">{msg.quiz.explanation}</p>
                            </div>
                          )}
                        </div>
                      )}

                      <div
                        className={`text-[10px] text-right ${
                          isUser ? 'text-blue-100' : 'text-slate-400'
                        }`}
                      >
                        {msg.timestamp}
                      </div>
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="bg-slate-100 rounded-2xl rounded-tl-none p-3.5 text-xs text-slate-600 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                    Gia sư AI đang phân tích dữ liệu và soạn câu trả lời...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Starter Questions */}
            {messages.length <= 2 && (
              <div className="px-6 py-2 bg-slate-50/50 border-t border-slate-100 flex items-center gap-2 overflow-x-auto shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                  Gợi ý hỏi:
                </span>
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(q)}
                    className="text-xs text-slate-600 hover:text-blue-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg hover:border-blue-400 transition-colors shrink-0 cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input Box */}
            <div className="p-4 border-t border-slate-100 bg-white shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-end gap-2"
              >
                <div className="flex-1 relative">
                  <textarea
                    rows={2}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Hỏi AI bất kỳ thắc mắc ngữ pháp, câu hỏi TOEIC hoặc gõ 'tạo bài tập'..."
                    className="w-full p-3 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!inputText.trim() || loading}
                  className={`p-3 rounded-xl font-semibold transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                    !inputText.trim() || loading
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                  }`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
