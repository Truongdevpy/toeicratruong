import { useAuth } from '../context/AuthContext';
import { AuthRequiredGate } from '../components/AuthRequiredGate';
import React, { useEffect, useState } from 'react';
import {
  Layers,
  CheckCircle2,
  Lock,
  Play,
  ArrowRight,
  Sparkles,
  RefreshCw,
  TrendingUp,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { LearningPath, LearningNode } from '../types';

interface LearningPathPageProps {
  onNavigate: (path: string) => void;
}

export const LearningPathPage: React.FC<LearningPathPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();

  const [pathData, setPathData] = useState<LearningPath | null>(null);
  const [selectedNode, setSelectedNode] = useState<LearningNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdapting, setIsAdapting] = useState(false);

  const loadPath = async () => {
    try {
      const data = await api.getLearningPath();
      setPathData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadPath();
  }, [user]);

  const handleRecalculate = async () => {
    setIsAdapting(true);
    try {
      await api.recalculateLearningPath();
      await loadPath();
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdapting(false);
    }
  };

  if (!user) {
    return (
      <AuthRequiredGate
        featureName="Lộ trình học thích ứng AI"
        featureDesc="Kế hoạch học tập cá nhân hóa dựa trên band điểm đầu vào và mục tiêu điểm ra trường."
        onNavigate={onNavigate}
      />
    );
  }

  if (isLoading || !pathData) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-slate-600">Đang tải lộ trình cá nhân hóa...</p>
        </div>
      </div>
    );
  }

  const weights = pathData.adaptive_weights || {
    grammar: 35,
    listening: 30,
    reading: 20,
    vocabulary: 15,
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header Summary Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-2">
                <Layers className="w-3.5 h-3.5" />
                Lộ trình dành riêng cho bạn
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {pathData.title}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Ước tính thời gian: <strong>{pathData.estimated_weeks} tuần</strong> (Khoảng 45 phút học/ngày)
              </p>
            </div>

            {/* Current vs Target Score Badge */}
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 shrink-0">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Hiện tại</span>
                <span className="text-2xl font-black text-slate-800">{pathData.current_score}</span>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300" />
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Mục tiêu</span>
                <span className="text-2xl font-black text-blue-600">{pathData.target_score}</span>
              </div>
            </div>
          </div>

          {/* Dynamic Personalization Indicator (PRD Section 17) */}
          <div className="pt-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Trọng số thích ứng hiện tại (Dynamic Personalization)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{pathData.adaptation_reason}</p>
              </div>

              <button
                type="button"
                disabled={isAdapting}
                onClick={handleRecalculate}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAdapting ? 'animate-spin' : ''}`} />
                Tối ưu lại theo bài tập mới
              </button>
            </div>

            {/* Weight Pill Bars */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Ngữ pháp & Word Form', weight: weights.grammar || 35, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
                { label: 'Listening Part 1-4', weight: weights.listening || 30, color: 'text-blue-700 bg-blue-50 border-blue-200' },
                { label: 'Reading Part 5-7', weight: weights.reading || 20, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                { label: 'Từ vựng cốt lõi', weight: weights.vocabulary || 15, color: 'text-amber-700 bg-amber-50 border-amber-200' },
              ].map((w, idx) => (
                <div key={idx} className={`p-3 rounded-xl border ${w.color} flex flex-col justify-between`}>
                  <span className="text-[11px] font-semibold">{w.label}</span>
                  <span className="text-lg font-black mt-1">{w.weight}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Milestone Roadmap Nodes Timeline */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Các chặng học tập theo trình tự
          </h2>

          <div className="space-y-4">
            {pathData.nodes.map((node, idx) => {
              const isCompleted = node.status === 'completed';
              const isInProgress = node.status === 'in_progress';

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    isInProgress
                      ? 'bg-white border-blue-600 shadow-md ring-2 ring-blue-500/10'
                      : isCompleted
                      ? 'bg-white border-emerald-200/90 hover:border-emerald-400'
                      : 'bg-slate-50/70 border-slate-200/70 opacity-80'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Status Icon */}
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-700'
                          : isInProgress
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : isInProgress ? (
                        <Play className="w-5 h-5 ml-0.5 fill-current" />
                      ) : (
                        <Lock className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-400 uppercase">
                          Mốc {idx + 1} • {node.skill}
                        </span>
                        {node.target_score_checkpoint && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            Checkpoint {node.target_score_checkpoint}đ
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-0.5">{node.title}</h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">{node.description}</p>
                    </div>
                  </div>

                  {/* Progress & Estimated Hours */}
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-800">{node.progress_pct}%</span>
                      <span className="text-[11px] text-slate-400 block">{node.estimated_hours} giờ học</span>
                    </div>
                    <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden shrink-0">
                      <div
                        className={`h-full rounded-full ${
                          isCompleted ? 'bg-emerald-600' : 'bg-blue-600'
                        }`}
                        style={{ width: `${node.progress_pct}%` }}
                      ></div>
                    </div>
                    <button
                      type="button"
                      className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Node Detail Modal / Drawer */}
      {selectedNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                  Chi tiết chuyên đề • {selectedNode.skill}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">{selectedNode.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">{selectedNode.description}</p>

            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 font-medium block">Số bài học / bài tập:</span>
                <span className="font-bold text-slate-800">{selectedNode.completed_lessons} / {selectedNode.lessons_count} đã học</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Thời gian ước lượng:</span>
                <span className="font-bold text-slate-800">{selectedNode.estimated_hours} giờ</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-800">Nội dung bài học tiêu biểu:</div>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                <li>Quy tắc nhận diện nhanh từ loại và bẫy đuôi -al, -ive</li>
                <li>Luyện tập 30 câu trắc nghiệm thực chiến trích từ đề Crack TOEIC</li>
                <li>Giải thích chi tiết lỗi sai và lưu từ vựng vào Flashcards</li>
              </ul>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
              >
                Đóng
              </button>

              <button
                type="button"
                onClick={() => {
                  const s = selectedNode.skill.toLowerCase();
                  setSelectedNode(null);
                  if (s.includes('listening')) onNavigate('/practice/listening');
                  else if (s.includes('reading')) onNavigate('/practice/reading');
                  else if (s.includes('vocabulary')) onNavigate('/practice/vocabulary');
                  else if (s.includes('grammar')) onNavigate('/practice/grammar');
                  else onNavigate('/mock-tests');
                }}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Bắt đầu học ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
