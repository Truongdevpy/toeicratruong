import React from 'react';
import {
  X,
  Play,
  FastForward,
  Lock,
  Sparkles,
  BookOpen,
  Award,
  AlertTriangle,
  HelpCircle,
  Star,
  Check,
  Bookmark
} from 'lucide-react';
import { GrammarTopic } from '../../types';
import {
  GrammarLessonNode,
  GrammarUserProgress
} from '../../services/grammarProgressService';

export interface DuolingoNodeModalProps {
  node: GrammarLessonNode;
  topic: GrammarTopic;
  progress: GrammarUserProgress;
  isVip: boolean;
  onClose: () => void;
  onStartLesson: () => void;
  onViewTheoryOnly: () => void;
  onSkipToNode?: (nodeId: string) => void;
  isAccessible?: boolean;
}

export const DuolingoNodeModal: React.FC<DuolingoNodeModalProps> = ({
  node,
  topic,
  progress,
  onClose,
  onStartLesson,
  onViewTheoryOnly,
  onSkipToNode,
  isAccessible = true
}) => {
  const nodeProg = progress.nodes[node.id];
  const isCompleted = nodeProg && nodeProg.status === 'completed';

  let iconBg = 'bg-blue-100 text-blue-600';
  let IconComp = BookOpen;
  if (node.type === 'traps') {
    iconBg = 'bg-amber-100 text-amber-600';
    IconComp = AlertTriangle;
  } else if (node.type === 'practice_basic') {
    iconBg = 'bg-purple-100 text-purple-600';
    IconComp = HelpCircle;
  } else if (node.type === 'practice_adv') {
    iconBg = 'bg-indigo-100 text-indigo-600';
    IconComp = Star;
  } else if (node.type === 'checkpoint') {
    iconBg = 'bg-emerald-100 text-emerald-600';
    IconComp = Award;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in slide-in-from-bottom sm:zoom-in-95 duration-150">
        
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${iconBg}`}>
              <IconComp className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                {topic.title_vi} • Bài {node.nodeIndex + 1}/9
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">{node.title}</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          {node.subtitle}
        </p>

        <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 font-medium block">Phần thưởng:</span>
            <span className="font-bold text-amber-600 flex items-center gap-1 mt-0.5">
              <Sparkles className="w-3.5 h-3.5" /> +{node.xpReward} XP
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Trạng thái:</span>
            <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
              {isCompleted ? (
                <span className="text-emerald-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Đã hoàn thành ({'★'.repeat(nodeProg?.stars || 1)})
                </span>
              ) : nodeProg?.checkpoint ? (
                <span className="text-amber-600 flex items-center gap-1">
                  <Bookmark className="w-3.5 h-3.5" /> Đang học dở
                </span>
              ) : (
                <span className="text-blue-600">Đang sẵn sàng</span>
              )}
            </span>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          {isAccessible ? (
            <button
              type="button"
              onClick={onStartLesson}
              className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-blue-500/20 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              {isCompleted
                ? 'Luyện tập lại (+XP)'
                : nodeProg?.checkpoint
                ? nodeProg.checkpoint.mode === 'theory'
                  ? `Tiếp tục học (Thẻ ${(nodeProg.checkpoint.theoryCardIdx ?? 0) + 1})`
                  : `Tiếp tục làm (Câu ${(nodeProg.checkpoint.questionIndex ?? 0) + 1})`
                : 'Bắt đầu bài học'}
            </button>
          ) : (
            <div className="space-y-2.5">
              <div className="w-full py-2.5 rounded-2xl bg-slate-100 text-slate-500 font-bold text-xs flex items-center justify-center gap-2 border border-slate-200">
                <Lock className="w-4 h-4" />
                <span>Bài học đang bị khóa</span>
              </div>
              {onSkipToNode && (
                <button
                  type="button"
                  onClick={() => onSkipToNode(node.id)}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:brightness-105 active:translate-y-1 text-white font-black text-xs uppercase tracking-wider border-b-[5px] border-amber-700 cursor-pointer transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2"
                >
                  <FastForward className="w-4 h-4 fill-white" />
                  <span>HỌC VƯỢT ĐỂ QUA BÀI NÀY ⚡</span>
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onViewTheoryOnly}
            className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            Xem lý thuyết & công thức chuyên đề này
          </button>
        </div>

      </div>
    </div>
  );
};
