import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Camera, Save, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, profile, refreshMe } = useAuth();
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [targetScore, setTargetScore] = useState<number>(750);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFullName(user?.full_name || (profile as any)?.full_name || '');
      setAvatarUrl(user?.avatar_url || (profile as any)?.avatar_url || '');
      setTargetScore(profile?.target_score || 750);
      setIsSuccess(false);
      setErrorMessage('');
    }
  }, [isOpen, user, profile]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMessage('Vui lÃ²ng nháº­p há» vÃ  tÃªn');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      await api.updateProfile({
        full_name: fullName.trim(),
        avatar_url: avatarUrl.trim(),
        target_score: targetScore,
      });
      await refreshMe();
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 800);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Cáº­p nháº­t thÃ´ng tin tháº¥t báº¡i, vui lÃ²ng thá»­ láº¡i.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Chá»‰nh sá»­a há»“ sÆ¡</h3>
              <p className="text-xs text-slate-500">Cáº­p nháº­t thÃ´ng tin cÃ¡ nhÃ¢n cá»§a báº¡n</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          {isSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Cáº­p nháº­t há»“ sÆ¡ thÃ nh cÃ´ng!</span>
            </div>
          )}

          {/* Avatar Preview & Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              áº¢nh Ä‘áº¡i diá»‡n
            </label>
            <div className="flex items-center gap-4 mb-3">
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-blue-500 bg-slate-100 shrink-0 shadow-xs">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <UserIcon className="w-8 h-8" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="DÃ¡n link áº£nh (URL)..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <p className="text-[11px] text-slate-400 mt-1">DÃ¡n liÃªn káº¿t áº£nh hoáº·c chá»n máº«u bÃªn dÆ°á»›i</p>
              </div>
            </div>

            {/* Preset Avatars */}
            <div className="flex items-center gap-2 pt-1">
              {PRESET_AVATARS.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAvatarUrl(url)}
                  className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-all cursor-pointer ${
                    avatarUrl === url ? 'border-blue-600 scale-110 shadow-xs' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Há» vÃ  tÃªn
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nháº­p há» vÃ  tÃªn..."
              className="w-full px-3.5 py-2.5 text-sm font-semibold border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all text-slate-800"
            />
          </div>

          {/* Target Score */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Má»¥c tiÃªu Ä‘iá»ƒm TOEIC: <span className="text-blue-600 font-extrabold">{targetScore}</span>
            </label>
            <input
              type="range"
              min={250}
              max={990}
              step={10}
              value={targetScore}
              onChange={(e) => setTargetScore(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-mono mt-1">
              <span>250</span>
              <span>550</span>
              <span>750</span>
              <span>990</span>
            </div>
          </div>

          {/* Footer Action */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Há»§y
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span>Äang lÆ°u...</span>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>LÆ°u thay Ä‘á»•i</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};