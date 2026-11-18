import React from 'react';
import { Trophy, Star, CheckCircle2, Lock, Play, Sparkles } from 'lucide-react';
import { VocabLessonNode, VocabUserProgress } from '../../types/vocabDuo';

interface VocabPathViewProps {
  progress: VocabUserProgress;
  onSelectNode: (node: VocabLessonNode) => void;
  onUnlockNext?: () => void;
}

export const VOCAB_UNITS: {
  id: string;
  title: string;
  description: string;
  nodes: VocabLessonNode[];
}[] = [
  {
    id: 'unit_1',
    title: 'Unit 1: Hợp đồng & Thương mại (Contracts & Commerce)',
    description: 'Nắm vững các thuật ngữ pháp lý cơ bản, đàm phán hợp đồng thương mại.',
    nodes: [
      { id: 'v_u1_n1', topicId: 'business', unitIndex: 1, nodeIndex: 0, type: 'theory', title: 'Thuật ngữ Hợp đồng', subtitle: 'Khái niệm & từ loại cốt lõi', wordCount: 8, xpReward: 20 },
      { id: 'v_u1_n2', topicId: 'business', unitIndex: 1, nodeIndex: 1, type: 'practice_basic', title: 'Luyện phản xạ từ', subtitle: 'Trắc nghiệm nghĩa tiếng Việt', wordCount: 8, xpReward: 25 },
      { id: 'v_u1_n3', topicId: 'business', unitIndex: 1, nodeIndex: 2, type: 'collocations', title: 'Collocations Hợp đồng', subtitle: 'Các cụm từ đi liền nhau', wordCount: 6, xpReward: 30 },
      { id: 'v_u1_n4', topicId: 'business', unitIndex: 1, nodeIndex: 3, type: 'checkpoint', title: 'Kiểm tra Chốt Unit 1', subtitle: 'Đánh giá độ thuần thục', wordCount: 10, xpReward: 50 },
    ]
  },
  {
    id: 'unit_2',
    title: 'Unit 2: Văn phòng & Nhân sự (Office & Personnel)',
    description: 'Giao tiếp công sở, thông báo nội bộ và quản trị nhân sự.',
    nodes: [
      { id: 'v_u2_n1', topicId: 'office', unitIndex: 2, nodeIndex: 0, type: 'theory', title: 'Thiết bị & Quy trình', subtitle: 'Từ vựng văn phòng phẩm', wordCount: 8, xpReward: 20 },
      { id: 'v_u2_n2', topicId: 'office', unitIndex: 2, nodeIndex: 1, type: 'practice_basic', title: 'Tuyển dụng & Đãi ngộ', subtitle: 'Phản xạ từ vựng HR', wordCount: 8, xpReward: 25 },
      { id: 'v_u2_n3', topicId: 'office', unitIndex: 2, nodeIndex: 2, type: 'checkpoint', title: 'Kiểm tra Chốt Unit 2', subtitle: 'Thử thách tổng hợp', wordCount: 10, xpReward: 50 },
    ]
  },
  {
    id: 'unit_3',
    title: 'Unit 3: Tài chính & Ngân hàng (Finance & Banking)',
    description: 'Báo cáo doanh thu, đầu tư chứng khoán và quản lý dòng tiền.',
    nodes: [
      { id: 'v_u3_n1', topicId: 'finance', unitIndex: 3, nodeIndex: 0, type: 'theory', title: 'Thuật ngữ Kế toán', subtitle: 'Doanh thu, chi phí, lợi nhuận', wordCount: 8, xpReward: 20 },
      { id: 'v_u3_n2', topicId: 'finance', unitIndex: 3, nodeIndex: 1, type: 'practice_basic', title: 'Giao dịch Ngân hàng', subtitle: 'Thanh toán & tín dụng', wordCount: 8, xpReward: 25 },
      { id: 'v_u3_n3', topicId: 'finance', unitIndex: 3, nodeIndex: 2, type: 'checkpoint', title: 'Kiểm tra Chốt Unit 3', subtitle: 'Chứng chỉ thành thạo', wordCount: 10, xpReward: 50 },
    ]
  }
];

export const VocabPathView: React.FC<VocabPathViewProps> = ({ progress, onSelectNode }) => {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-12">
      {VOCAB_UNITS.map((unit, uIdx) => (
        <div key={unit.id} className="space-y-6">
          {/* Unit Header Banner */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5 rounded-3xl shadow-lg flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-200">Lộ trình Chinh phục</div>
              <h2 className="text-lg font-black">{unit.title}</h2>
              <p className="text-xs text-emerald-100 mt-0.5">{unit.description}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0">
              <Trophy className="w-6 h-6 text-amber-300" />
            </div>
          </div>

          {/* Duolingo Winding Path Nodes */}
          <div className="flex flex-col items-center space-y-6 py-4 relative">
            {unit.nodes.map((node, nIdx) => {
              const nodeProg = progress.nodes[node.id];
              const isCompleted = nodeProg?.status === 'completed';
              const isUnlocked = isCompleted || nIdx === 0 || uIdx === 0 || nodeProg?.status === 'unlocked';
              
              // Curve offset pattern: 0 -> center, 1 -> right, 2 -> left, 3 -> center
              const offsetClasses = [
                'translate-x-0',
                'translate-x-12 sm:translate-x-16',
                '-translate-x-12 sm:-translate-x-16',
                'translate-x-0'
              ][nIdx % 4];

              return (
                <div key={node.id} className={`flex flex-col items-center transition-all ${offsetClasses}`}>
                  <button
                    type="button"
                    onClick={() => isUnlocked && onSelectNode(node)}
                    disabled={!isUnlocked}
                    className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full flex flex-col items-center justify-center font-black transition-all shadow-xl cursor-pointer ${
                      isCompleted
                        ? 'bg-amber-400 text-slate-900 border-b-4 border-amber-600 hover:scale-105'
                        : isUnlocked
                        ? 'bg-emerald-500 text-white border-b-4 border-emerald-700 hover:scale-105 active:translate-y-1'
                        : 'bg-slate-200 text-slate-400 border-b-4 border-slate-300 cursor-not-allowed opacity-80'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-8 h-8 text-amber-950" />
                    ) : isUnlocked ? (
                      <Play className="w-8 h-8 fill-white translate-x-0.5" />
                    ) : (
                      <Lock className="w-7 h-7" />
                    )}

                    {/* Star Badge */}
                    {isCompleted && (
                      <div className="absolute -top-1 -right-1 bg-amber-500 text-amber-950 p-1 rounded-full border border-white shadow-xs">
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </div>
                    )}
                  </button>

                  {/* Title Label Bubble */}
                  <div className="mt-2 text-center max-w-[150px]">
                    <div className="text-xs font-extrabold text-slate-800 line-clamp-1">{node.title}</div>
                    <div className="text-[10px] text-slate-500 line-clamp-1">{node.subtitle}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
