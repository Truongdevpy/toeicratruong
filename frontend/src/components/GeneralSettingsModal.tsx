import React from 'react';
import {
  X,
  Settings,
  Bot,
  MessageSquare,
  Sparkles,
  Volume2,
  Zap,
  Crown,
  Lightbulb,
  BookOpen,
  RotateCcw,
  Check,
  Globe,
  Sliders,
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { TRANSLATIONS } from '../i18n/translations';

interface GeneralSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRBAC?: () => void;
}

const PRESET_SPEEDS = [0.5, 0.75, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0];

export const GeneralSettingsModal: React.FC<GeneralSettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenRBAC,
}) => {
  const {
    settings,
    setLanguage,
    toggleFloatingAITutor,
    toggleFloatingChat,
    toggleSfx,
    toggleAutoAdvance,
    toggleSongNgu,
    toggleDanChung,
    toggleMeoLamBai,
    toggleTuVung,
    setPlaybackSpeed,
    setVisualEffects,
    resetSettings,
  } = useSettings();

  const { user } = useAuth();
  const isVipUser = Boolean(user?.is_vip || user?.role === 'vip' || user?.role === 'admin');

  const lang = settings.language || (typeof window !== 'undefined' && localStorage.getItem('app_language') === 'en' ? 'en' : 'vi');
  const t = TRANSLATIONS[lang] || TRANSLATIONS.vi;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] z-10 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-100 text-[#1E4E9E] flex items-center justify-center shadow-xs">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{t.settingsTitle}</h2>
              <p className="text-xs text-slate-500">{t.settingsSubtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            title={lang === 'en' ? 'Close settings' : 'Đóng cài đặt'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* SECTION 0: NGÔN NGỮ GIAO DIỆN (INTERFACE LANGUAGE) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                {t.interfaceLanguage}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {lang === 'en' ? 'English (US)' : 'Tiếng Việt'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setLanguage('vi')}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  lang === 'vi'
                    ? 'bg-white text-blue-700 shadow-2xs ring-1 ring-blue-500/20'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="text-sm">🇻🇳</span>
                <span>Tiếng Việt</span>
                {lang === 'vi' && <Check className="w-3.5 h-3.5 text-blue-600 ml-auto" />}
              </button>

              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  lang === 'en'
                    ? 'bg-white text-blue-700 shadow-2xs ring-1 ring-blue-500/20'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="text-sm">🇺🇸</span>
                <span>English</span>
                {lang === 'en' && <Check className="w-3.5 h-3.5 text-blue-600 ml-auto" />}
              </button>
            </div>
          </div>

          {/* SECTION 1: NÚT NỔI TIỆN ÍCH (FLOATING BUTTONS) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                {t.floatingButtonsTitle}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">{t.defaultOn}</span>
            </div>

            {/* Visual preview strip */}
            <div className="p-3 bg-gradient-to-r from-slate-100 via-indigo-50/50 to-blue-50/50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-600 text-[11px] font-medium hidden sm:inline">
                {t.previewRightCorner}
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all shadow-xs ${
                    settings.showFloatingAITutor
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white opacity-100 scale-100'
                      : 'bg-slate-200 text-slate-400 opacity-40 line-through'
                  }`}
                >
                  <Bot className="w-3 h-3" />
                  <span>{t.aiTutorBadge}</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all shadow-xs ${
                    settings.showFloatingChat
                      ? 'bg-blue-600 text-white opacity-100 scale-100'
                      : 'bg-slate-200 text-slate-400 opacity-40 line-through'
                  }`}
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>{t.messagesBadge}</span>
                </div>
              </div>
            </div>

            {/* Toggle 1: Nút nổi Gia sư AI */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-indigo-300 transition-all">
              <div className="flex items-start gap-3 min-w-0 pr-3">
                <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      {t.floatingAITutorTitle}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-violet-100 text-violet-800 text-[10px] font-bold">
                      {t.defaultOn}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                    {t.floatingAITutorDesc}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleFloatingAITutor}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  settings.showFloatingAITutor ? 'bg-gradient-to-r from-violet-600 to-indigo-600' : 'bg-slate-200'
                }`}
                title={settings.showFloatingAITutor ? (lang === 'en' ? 'Enabled - Click to hide' : 'Đang bật - Nhấn để ẩn') : (lang === 'en' ? 'Disabled - Click to show' : 'Đang tắt - Nhấn để hiện')}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                    settings.showFloatingAITutor ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 2: Nút nổi Tin nhắn */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-blue-300 transition-all">
              <div className="flex items-start gap-3 min-w-0 pr-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      {t.floatingChatTitle}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                      {t.defaultOn}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                    {t.floatingChatDesc}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleFloatingChat}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  settings.showFloatingChat ? 'bg-blue-600' : 'bg-slate-200'
                }`}
                title={settings.showFloatingChat ? (lang === 'en' ? 'Enabled - Click to hide' : 'Đang bật - Nhấn để ẩn') : (lang === 'en' ? 'Disabled - Click to show' : 'Đang tắt - Nhấn để hiện')}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                    settings.showFloatingChat ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* SECTION 2: TRẢI NGHIỆM HỌC TẬP & LÀM BÀI */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              {t.studyExperienceTitle}
            </span>

            {/* Hiệu ứng âm thanh (SFX) */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2.5">
                <Volume2 className="w-4 h-4 text-slate-600" />
                <div>
                  <div className="text-xs font-bold text-slate-800">{t.sfxTitle}</div>
                  <p className="text-[10px] text-slate-500">{t.sfxDesc}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleSfx}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.sfx ? 'bg-[#1E4E9E]' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                    settings.sfx ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Tự động chuyển câu */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2.5">
                <Zap className="w-4 h-4 text-amber-500" />
                <div>
                  <div className="text-xs font-bold text-slate-800">{t.autoAdvanceTitle}</div>
                  <p className="text-[10px] text-slate-500">{t.autoAdvanceDesc}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleAutoAdvance}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.autoAdvance ? 'bg-[#1E4E9E]' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                    settings.autoAdvance ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Song ngữ (VIP) */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2.5">
                <Crown className="w-4 h-4 text-amber-500" />
                <div>
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    {t.bilingualTitle}
                    <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black">
                      VIP
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">{t.bilingualDesc}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isVipUser) {
                    onOpenRBAC?.();
                    return;
                  }
                  toggleSongNgu();
                }}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.songNgu ? 'bg-amber-400' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                    settings.songNgu ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Dẫn chứng đáp án 👑 (Part 3, 4, 6, 7) */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2.5">
                <Crown className="w-4 h-4 text-emerald-600" />
                <div>
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    {t.evidenceTitle}
                    <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black">
                      VIP
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">{t.evidenceDesc}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isVipUser) {
                    onOpenRBAC?.();
                    return;
                  }
                  toggleDanChung();
                }}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.danChung ? 'bg-emerald-500' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                    settings.danChung ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Mẹo làm bài Part 5 */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2.5">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <div>
                  <div className="text-xs font-bold text-slate-800">{t.tipsTitle}</div>
                  <p className="text-[10px] text-slate-500">{t.tipsDesc}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleMeoLamBai}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.meoLamBai ? 'bg-[#1E4E9E]' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                    settings.meoLamBai ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Từ vựng quan trọng */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <div>
                  <div className="text-xs font-bold text-slate-800">{t.vocabTitle}</div>
                  <p className="text-[10px] text-slate-500">{t.vocabDesc}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleTuVung}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.tuVung ? 'bg-emerald-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                    settings.tuVung ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* SECTION 3: TỐC ĐỘ PHÁT ÂM THANH MẶC ĐỊNH (AUDIO SPEED SETTINGS & CUSTOM TUNING) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                {t.audioSpeedTitle}
              </span>
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200/80">
                <span>{settings.playbackSpeed.toFixed(2)}x</span>
                {Math.abs(settings.playbackSpeed - 1.0) < 0.01 && (
                  <span className="text-[10px] font-sans font-semibold text-emerald-600">
                    ({t.etsStandard})
                  </span>
                )}
              </div>
            </div>

            {/* Multi-step preset speed pills */}
            <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              {PRESET_SPEEDS.map((spd) => {
                const isActive = Math.abs(settings.playbackSpeed - spd) < 0.01;
                return (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`flex-1 min-w-[42px] py-1.5 px-1 text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs scale-102 ring-1 ring-blue-500/30'
                        : 'bg-white/80 text-slate-700 hover:bg-white hover:text-slate-900'
                    }`}
                  >
                    {spd}x
                  </button>
                );
              })}
            </div>

            {/* Continuous slider & fine-tuning buttons (-0.05 / +0.05) */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPlaybackSpeed(Math.max(0.5, Math.round((settings.playbackSpeed - 0.05) * 100) / 100))}
                className="w-8 h-8 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-black text-sm flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
                title={lang === 'en' ? 'Decrease speed by 0.05x' : 'Giảm 0.05x'}
              >
                -
              </button>

              <div className="flex-1 flex flex-col justify-center">
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={settings.playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                  <span>0.5x</span>
                  <span>1.0x (ETS)</span>
                  <span>1.5x</span>
                  <span>2.0x</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPlaybackSpeed(Math.min(2.0, Math.round((settings.playbackSpeed + 0.05) * 100) / 100))}
                className="w-8 h-8 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-black text-sm flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
                title={lang === 'en' ? 'Increase speed by 0.05x' : 'Tăng 0.05x'}
              >
                +
              </button>
            </div>
          </div>

          {/* Visual Effects Level Switcher */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    {lang === 'en' ? 'Visual Effects' : 'Hiệu ứng hình ảnh'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {lang === 'en'
                      ? 'Full (60fps) / Reduced / Off'
                      : 'Đầy đủ (60fps) / Giảm bớt / Tắt hoàn toàn'}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              {[
                { id: 'full', label: lang === 'en' ? 'Full' : 'Đầy đủ', desc: lang === 'en' ? '60fps' : 'Đầy đủ 60fps' },
                { id: 'reduced', label: lang === 'en' ? 'Reduced' : 'Giảm bớt', desc: lang === 'en' ? 'Soft fade' : 'Chuyển động nhẹ' },
                { id: 'off', label: lang === 'en' ? 'Off' : 'Tắt', desc: lang === 'en' ? 'Instant' : 'Tắt chuyển động' },
              ].map((opt) => {
                const isActive = (settings.visualEffects || 'full') === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setVisualEffects(opt.id as 'full' | 'reduced' | 'off')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${isActive ? 'bg-purple-600 text-white shadow-xs ring-1 ring-purple-500/30' : 'bg-white/80 text-slate-700 hover:bg-white hover:text-slate-900'}`}
                  >
                    <span>{opt.label}</span>
                    <span className={`text-[9px] font-normal ${isActive ? 'text-purple-100' : 'text-slate-400'}`}>
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={resetSettings}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            title={lang === 'en' ? 'Reset to factory defaults' : 'Khôi phục cài đặt gốc'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.resetDefault}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{t.done}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
