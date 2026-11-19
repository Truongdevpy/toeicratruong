import React, { useState, useEffect, useRef } from 'react';
import {
  Trophy,
  Star,
  CheckCircle2,
  Lock,
  Play,
  Sparkles,
  BookOpen,
  ArrowDown,
  FastForward,
  X,
  Flame,
  Award,
  Calendar
} from 'lucide-react';
import { GrammarTopic } from '../../types';
import {
  GrammarLessonNode,
  GrammarUserProgress,
  grammarProgressService
} from '../../services/grammarProgressService';

export interface DuolingoPathViewProps {
  topics: GrammarTopic[];
  progress: GrammarUserProgress;
  isVip: boolean;
  selectedTopicId?: string | null;
  onSelectTopic: (id: string) => void;
  onOpenNode: (node: GrammarLessonNode, topic: GrammarTopic) => void;
  onSkipTopic?: (topicId: string, topicNodes: GrammarLessonNode[]) => void;
  userId?: string | number;
  isDailyReviewCompletedToday?: boolean;
  onOpenReviewModal?: () => void;
  onOpenFastPassModal?: () => void;
}

export const DuolingoPathView: React.FC<DuolingoPathViewProps> = ({
  topics,
  progress,
  isVip,
  selectedTopicId,
  onSelectTopic,
  onOpenNode,
  onSkipTopic,
  userId,
  isDailyReviewCompletedToday,
  onOpenReviewModal,
  onOpenFastPassModal
}) => {
  const [activeTooltipNodeId, setActiveTooltipNodeId] = useState<string | null>(null);
  const [jumpModalTopic, setJumpModalTopic] = useState<any | null>(null);
  const activeNodeRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to active lesson node
  const scrollToActiveNode = () => {
    if (activeNodeRef.current) {
      activeNodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      window.scrollTo({ top: 300, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToActiveNode();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const themeClasses: Record<string, { headerBg: string; border: string; accent: string }> = {
    green: {
      headerBg: 'bg-[#58CC02] border-[#46A302] text-white',
      border: 'border-[#58CC02]',
      accent: 'bg-[#58CC02]'
    },
    blue: {
      headerBg: 'bg-[#1CB0F6] border-[#1899D6] text-white',
      border: 'border-[#1CB0F6]',
      accent: 'bg-[#1CB0F6]'
    },
    purple: {
      headerBg: 'bg-[#CE82FF] border-[#BA57FF] text-white',
      border: 'border-[#CE82FF]',
      accent: 'bg-[#CE82FF]'
    },
    pink: {
      headerBg: 'bg-[#FF4B4B] border-[#EA2B2B] text-white',
      border: 'border-[#FF4B4B]',
      accent: 'bg-[#FF4B4B]'
    }
  };

  // Helper to determine node icon
  const themeKeys = ['green', 'blue', 'purple', 'pink'];

  const getNodeIcon = (node: GrammarLessonNode, isCompleted: boolean, isLocked: boolean) => {
    if (isCompleted) return <CheckCircle2 className="w-8 h-8 text-white drop-shadow-xs" />;
    if (isLocked) return <Lock className="w-6 h-6 text-slate-400" />;
    if (node.type === 'theory') return <BookOpen className="w-7 h-7 text-white" />;
    
    if (node.type === 'checkpoint') return <Trophy className="w-7 h-7 text-white" />;
    return <Star className="w-7 h-7 text-white fill-white" />;
  };

  return (
    <div data-testid="duolingo-path" className="w-full max-w-xl mx-auto py-4 px-3 sm:px-4 select-none relative pb-32">
      {/* Daily Review SRS Banner */}
      {onOpenReviewModal && (
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-2 border-amber-300 rounded-3xl p-5 flex items-center justify-between shadow-xs mb-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-black text-slate-800 text-sm">Ôn tập ngắt quãng (SRS) hàng ngày</h4>
              <p className="text-xs text-slate-600 mt-0.5">
                {isDailyReviewCompletedToday
                  ? 'Hôm nay bạn đã hoàn thành ôn tập. Xuất sắc!'
                  : 'Củng cố trí nhớ với 5-10 câu hỏi ôn tập ngữ pháp hôm nay.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenReviewModal}
            className={`px-4 py-2.5 rounded-2xl font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              isDailyReviewCompletedToday
                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            {isDailyReviewCompletedToday ? 'Ôn lại' : 'Bắt đầu ôn'}
          </button>
        </div>
      )}
      {topics.map((topic, uIdx) => {
        const theme = themeClasses[themeKeys[uIdx % themeKeys.length]] || themeClasses.green;
        const nodes = grammarProgressService.getLessonNodes(topic);
        const completedNodes = nodes.filter((n: GrammarLessonNode) => progress.nodes?.[n.id]?.status === 'completed').length;
        const isTopicComplete = completedNodes >= nodes.length;

        return (
          <div key={topic.id} className="mb-14 relative">
            {/* Duolingo Section Header (Photos 1, 2, 3, 5) */}
            <div
              className={`rounded-2xl p-4 sm:p-5 border-b-4 shadow-md flex items-center justify-between mb-8 sticky top-3 z-30 transition-all ${theme.headerBg}`}
            >
              <div>
                <div className="text-[11px] sm:text-xs font-black tracking-wider uppercase opacity-90">
                  PHẦN {uIdx + 1}, CỬA {uIdx * 3 + 1}
                </div>
                <h3 className="text-base sm:text-lg font-black tracking-tight mt-0.5 leading-snug">
                  {topic.title_vi || topic.title_en}
                </h3>
                <div className="text-xs font-medium opacity-90 mt-0.5">
                  {topic.description_vi || topic.title_en}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onSelectTopic(String(topic.id));
                  if (nodes[0]) onOpenNode(nodes[0], topic);
                }}
                className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-xs flex items-center justify-center cursor-pointer transition-colors shrink-0"
                title="Xem lý thuyết trọng tâm"
              >
                <BookOpen className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Winding Path Nodes */}
            <div className="flex flex-col items-center space-y-6 relative py-2">
              {nodes.map((node, nIdx) => {
                const nodeProg = progress.nodes[node.id];
                const isCompleted = nodeProg?.status === 'completed';
                const isAccessible = grammarProgressService.isNodeAccessible(node.id, nodes, progress, isVip);
                const isLocked = !isAccessible;
                const isCurrent = isAccessible && !isCompleted;

                // S-Curve Offsets (Center -> Right -> Far Right -> Center -> Left -> Far Left)
                const curveOffsets = [
                  'translate-x-0',
                  'translate-x-12 sm:translate-x-16',
                  'translate-x-20 sm:translate-x-24',
                  'translate-x-10 sm:translate-x-12',
                  'translate-x-0',
                  '-translate-x-10 sm:-translate-x-12',
                  '-translate-x-20 sm:-translate-x-24',
                  '-translate-x-12 sm:-translate-x-16'
                ];
                const offsetClass = curveOffsets[(uIdx * 5 + nIdx) % curveOffsets.length];

                return (
                  <div
                    key={node.id}
                    ref={isCurrent ? activeNodeRef : undefined}
                    className={`flex flex-col items-center relative ${offsetClass}`}
                  >
                    {/* 3D Duolingo Node Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTooltipNodeId((prev) => (prev === node.id ? null : node.id));
                      }}
                      className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full flex flex-col items-center justify-center font-black transition-all shadow-xl cursor-pointer ${
                        isCompleted
                          ? 'bg-[#FFC800] border-b-6 border-[#E5A500] hover:scale-105 active:translate-y-1'
                          : isCurrent
                          ? 'bg-[#58CC02] border-b-6 border-[#46A302] hover:scale-105 active:translate-y-1 ring-8 ring-[#58CC02]/25 animate-bounce-subtle'
                          : !isLocked
                          ? 'bg-[#1CB0F6] border-b-6 border-[#1899D6] hover:scale-105'
                          : 'bg-[#E5E5E5] border-b-6 border-[#CECECE] cursor-pointer'
                      }`}
                    >
                      {getNodeIcon(node, isCompleted, isLocked)}

                      {/* Stars count under node */}
                      {isCompleted && (
                        <div className="absolute -bottom-2 flex items-center gap-0.5">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        </div>
                      )}
                    </button>

                    {/* Popover Tooltip Dialog on Node Click (Photos 2 & 9) */}
                    {activeTooltipNodeId === node.id && (
                      <div className="absolute -top-32 z-40 bg-[#FF4B4B] text-white p-4 rounded-3xl shadow-2xl w-64 text-center animate-in zoom-in-95 duration-150 border-2 border-white">
                        {!isLocked ? (
                          <div className="space-y-2">
                            <div className="text-xs font-black tracking-wide uppercase opacity-90">
                              {isCompleted ? 'Ôn tập lại' : 'Điểm học tập'}
                            </div>
                            <h4 className="text-sm font-black truncate">{node.title}</h4>
                            <div className="text-[11px] opacity-90">{node.subtitle} ({node.questionCount} câu)</div>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTooltipNodeId(null);
                                onSelectTopic(String(topic.id));
                                onOpenNode(node, topic);
                              }}
                              className="w-full py-2.5 rounded-2xl bg-white text-[#FF4B4B] hover:bg-slate-50 font-black text-xs uppercase tracking-wider shadow-md transition-transform active:scale-95 cursor-pointer mt-1"
                            >
                              BẮT ĐẦU +{node.xpReward} XP
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2 bg-slate-800 text-white -m-4 p-4 rounded-3xl border-2 border-slate-700">
                            <h4 className="text-sm font-black">{node.title}</h4>
                            <p className="text-xs text-slate-300">
                              Hãy hoàn thành tất cả các cấp độ phía trên để mở khóa!
                            </p>
                            <button
                              disabled
                              className="w-full py-2 rounded-xl bg-slate-700 text-slate-400 font-bold text-xs uppercase cursor-not-allowed"
                            >
                              KHÓA
                            </button>
                          </div>
                        )}
                        <div className="w-3 h-3 bg-[#FF4B4B] rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Jump Ahead / Học vượt Banner */}
            {onSkipTopic && !isTopicComplete && (
              <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-300/80 flex flex-col items-center justify-center space-y-2 text-center">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Kế tiếp: Phần {uIdx + 2}
                </div>
                <button
                  type="button"
                  onClick={() => setJumpModalTopic({ topic, nodes, topicIndex: uIdx + 1 })}
                  className="px-6 py-2.5 rounded-2xl border-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-black text-xs uppercase tracking-wider shadow-xs transition-transform active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <FastForward className="w-4 h-4 text-emerald-600" />
                  <span>HỌC VƯỢT?</span>
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Floating Scroll Down to Current Node Button (Photos 1, 3, 5, 8) */}
      <button
        type="button"
        onClick={scrollToActiveNode}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-2xl bg-slate-900/80 hover:bg-slate-900 text-white shadow-xl flex items-center justify-center cursor-pointer transition-transform active:scale-90 border border-slate-700"
        title="Cuộn tới bài đang học"
      >
        <ArrowDown className="w-6 h-6 animate-pulse" />
      </button>

      {/* Modal Học Vượt (Jump Test Modal) */}
      {jumpModalTopic && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#131F24] border border-slate-700 rounded-3xl max-w-sm w-full p-6 text-center space-y-6 shadow-2xl text-white">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setJumpModalTopic(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
              <Sparkles className="w-10 h-10 animate-bounce" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black">
                Nhảy tới Phần {jumpModalTopic.topicIndex + 1} nhé!
              </h3>
              <p className="text-xs text-slate-300">
                Vượt cấp để mở khóa ngay lập tức toàn bộ các bài của chuyên đề {jumpModalTopic.topic.title_vi}.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  onSkipTopic?.(String(jumpModalTopic.topic.id), jumpModalTopic.nodes);
                  setJumpModalTopic(null);
                }}
                className="w-full py-3.5 rounded-2xl bg-[#1CB0F6] hover:bg-[#1899D6] text-white font-black text-xs uppercase tracking-wider shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                XÁC NHẬN HỌC VƯỢT
              </button>
              <button
                type="button"
                onClick={() => setJumpModalTopic(null)}
                className="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-white uppercase tracking-wider cursor-pointer"
              >
                KHÔNG, CẢM ƠN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
