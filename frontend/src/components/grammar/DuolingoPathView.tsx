import React from 'react';
import {
  Compass,
  CheckCircle2,
  Lock,
  Play,
  Star,
  Sparkles,
  Award,
  ChevronRight,
  Flame,
  Calendar,
  FastForward,
  BookOpen
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
  onOpenFastPassModal,
}) => {
  return (
    <div className="w-full max-w-3xl mx-auto py-6 px-4 space-y-8 select-none">
      {/* Daily Review SRS Banner */}
      {onOpenReviewModal && (
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-300 rounded-3xl p-5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Ôn tập ngắt quãng (SRS) hàng ngày</h4>
              <p className="text-xs text-slate-600 mt-0.5">
                {isDailyReviewCompletedToday
                  ? 'Hôm nay bạn đã hoàn thành ôn tập. Xuất sắc!'
                  : 'Củng cố trí nhớ với 5-10 câu hỏi ôn tập ngữ pháp hôm nay.'}
              </p>
            </div>
          </div>
          <button
            onClick={onOpenReviewModal}
            className={`px-4 py-2.5 rounded-2xl font-bold text-xs shadow-sm transition-all flex items-center gap-2 ${
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

      {/* Topics Roadmap */}
      {topics.map((topic, topicIdx) => {
        const nodes = grammarProgressService.getLessonNodes(topic);
        const completedNodes = nodes.filter((n: GrammarLessonNode) => progress.nodes?.[n.id]?.status === 'completed').length;
        const totalNodes = nodes.length || 1;
        const isTopicComplete = completedNodes >= totalNodes;
        const isCurrent = (String(selectedTopicId) === String(topic.id)) || (!selectedTopicId && topicIdx === 0);

        return (
          <div
            key={topic.id}
            className={`bg-white rounded-3xl border transition-all p-6 ${
              isCurrent
                ? 'border-indigo-300 shadow-md ring-2 ring-indigo-500/10'
                : 'border-slate-200/80 shadow-xs'
            }`}
          >
            {/* Topic Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 font-black text-xs flex items-center justify-center">
                  {topicIdx + 1}
                </span>
                <div>
                  <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                    {topic.title_vi || topic.title_en}
                    {isTopicComplete && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 inline shrink-0" />
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {topic.description_vi || topic.title_en}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onSkipTopic && !isTopicComplete && (
                  <button
                    onClick={() => onSkipTopic(String(topic.id), nodes)}
                    className="p-2 text-slate-400 hover:text-indigo-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Bỏ qua chuyên đề"
                  >
                    <FastForward className="w-4 h-4" />
                  </button>
                )}
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  {completedNodes}/{totalNodes} bài
                </span>
              </div>
            </div>

            {/* Path Nodes Visual */}
            <div className="pt-6 flex flex-col items-center gap-6 relative">
              {nodes.map((node: GrammarLessonNode, nodeIdx: number) => {
                const nodeState = progress.nodes?.[node.id];
                const isNodeDone = nodeState?.status === 'completed';
                const isAccessible = grammarProgressService.isNodeAccessible(node.id, nodes, progress, isVip);
                const isLocked = !isAccessible;

                const offsetClass =
                  nodeIdx % 3 === 1 ? 'translate-x-10' : nodeIdx % 3 === 2 ? '-translate-x-10' : '';

                return (
                  <div key={node.id} className={`flex flex-col items-center ${offsetClass}`}>
                    <button
                      disabled={isLocked}
                      onClick={() => onOpenNode(node, topic)}
                      className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-lg cursor-pointer ${
                        isNodeDone
                          ? 'bg-emerald-500 text-white shadow-emerald-500/30 ring-4 ring-emerald-100'
                          : isLocked
                          ? 'bg-slate-200 text-slate-400 shadow-slate-200 cursor-not-allowed'
                          : 'bg-indigo-600 text-white shadow-indigo-600/30 ring-4 ring-indigo-100 hover:scale-105'
                      }`}
                    >
                      {isNodeDone ? (
                        <CheckCircle2 className="w-8 h-8" />
                      ) : isLocked ? (
                        <Lock className="w-6 h-6" />
                      ) : (
                        <Play className="w-7 h-7 fill-white translate-x-0.5" />
                      )}

                      <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white text-slate-700 text-[10px] font-black flex items-center justify-center border border-slate-200 shadow-xs">
                        {nodeIdx + 1}
                      </span>
                    </button>
                    <span className="mt-2 text-xs font-semibold text-slate-700 text-center max-w-[140px] truncate">
                      {node.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
