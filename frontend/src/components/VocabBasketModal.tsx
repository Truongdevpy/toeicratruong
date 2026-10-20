import React, { useState, useSyncExternalStore } from 'react';
import {
  ShoppingBag,
  X,
  Search,
  Volume2,
  Trash2,
  Layers,
  BookOpen,
  Crown
} from 'lucide-react';
import { practiceProgressStore, SavedVocabItem } from '../services/practiceProgressStore';
import { useAuth } from '../context/AuthContext';

interface VocabBasketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (path: string) => void;
  onOpenRBAC?: () => void;
}

export const VocabBasketModal: React.FC<VocabBasketModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenRBAC
}) => {
  const { user } = useAuth();
  const isVip = user?.role === 'vip' || user?.role === 'admin' || user?.is_vip;
  const items = useSyncExternalStore<SavedVocabItem[]>(
    practiceProgressStore.subscribe,
    practiceProgressStore.getSavedVocabs,
    practiceProgressStore.getSavedVocabs
  );
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const handleSpeak = (text: string) => {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'en-US';
        utter.rate = 0.9;
        window.speechSynthesis.speak(utter);
      }
    } catch {}
  };

  const handleRemove = (word: string) => {
    practiceProgressStore.removeSavedVocab(word);
  };

  const filtered = items.filter(
    (item) =>
      item.word.toLowerCase().includes(search.toLowerCase()) ||
      item.meaning.toLowerCase().includes(search.toLowerCase()) ||
      (item.context && item.context.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 font-sans">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50/70 to-orange-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900">
                  Giỏ từ vựng đã lưu
                </h3>
                {isVip ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-500 fill-amber-500" /> Không giới hạn
                  </span>
                ) : (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    items.length >= 30
                      ? 'bg-rose-100 text-rose-700 border border-rose-200'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {items.length}/30 từ (Gói Thường)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {items.length} từ vựng quan trọng cần ôn tập theo thuật toán SRS
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 sm:p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Limit Warning for Free Tier */}
        {!isVip && items.length >= 30 && (
          <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Giỏ từ đã đạt giới hạn tối đa 30 từ của Gói Thường.</span>
            </div>
            {onOpenRBAC && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRBAC();
                }}
                className="font-bold underline text-amber-800 hover:text-amber-950 shrink-0 cursor-pointer"
              >
                Nâng cấp VIP 👑
              </button>
            )}
          </div>
        )}

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm từ tiếng Anh hoặc nghĩa tiếng Việt..."
              className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
        </div>

        {/* Word List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500 font-medium">
                {search ? 'Không tìm thấy từ vựng phù hợp' : 'Giỏ từ đang trống. Hãy bấm "+ Lưu từ" khi làm bài để thêm vào đây!'}
              </p>
            </div>
          ) : (
            filtered.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 hover:border-amber-300 transition-all flex items-start justify-between gap-3 group"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900">
                      {item.word}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSpeak(item.word)}
                      className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-amber-600 rounded-md transition-colors cursor-pointer"
                      title="Nghe phát âm chuẩn"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-xs text-slate-600 font-medium">
                    {item.meaning}
                  </div>
                  {item.context && (
                    <div className="text-[11px] text-slate-500 italic bg-white/70 px-2.5 py-1 rounded-lg border border-slate-200/60 mt-1 inline-block">
                      &quot;{item.context}&quot;
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleRemove(item.word)}
                  className="p-2.5 min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                  title="Xóa khỏi giỏ"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-white">
          <div className="text-[11px] text-slate-400 font-medium">
            Tự động đồng bộ với Flashcards SRS
          </div>
          <div className="flex items-center gap-2">
            {onNavigate && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigate('/practice/flashcards');
                }}
                className="px-5 py-2.5 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Luyện Flashcards</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 min-h-[44px] rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-center"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
