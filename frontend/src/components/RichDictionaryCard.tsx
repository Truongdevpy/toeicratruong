import React, { useState, useEffect } from 'react';
import {
  Volume2,
  Copy,
  Check,
  RotateCw,
  FolderPlus,
  Plus,
  Sparkles,
  ChevronDown,
  Loader2,
  X
} from 'lucide-react';

export interface CollocationItem {
  phrase: string;
  meaning: string;
}

export interface SynonymItem {
  word: string;
  meaning: string;
}

export interface OtherMeaningItem {
  part_of_speech: string;
  meaning: string;
  definition_en?: string;
  example?: string;
  example_vi?: string;
}

export interface WordFamilyItem {
  word: string;
  part_of_speech: string;
  meaning: string;
}

export interface CardTabItem {
  id: string;
  tab_label: string;
  title: string;
  subtitle: string;
  definition_en: string;
  meaning_vi: string;
  example_en?: string;
  example_vi?: string;
  audio_text?: string;
}

export interface WordDetail {
  word: string;
  ipa?: string;
  ipa_us?: string;
  ipa_uk?: string;
  audio_us?: string;
  audio_uk?: string;
  part_of_speech?: string;
  context_pos?: string;
  context_meaning?: string;
  definition_en?: string;
  meaning?: string;
  example?: string;
  example_vi?: string;
  collocations?: CollocationItem[];
  synonyms?: SynonymItem[];
  toeic_tip?: string;
  other_meanings?: OtherMeaningItem[];
  word_family?: WordFamilyItem[];
  card_tabs?: CardTabItem[];
  difficulty_level?: number | string;
  difficulty_label?: string;
}

export interface TranslateResult {
  original_text: string;
  sentence?: string;
  translation: string;
  type: 'word' | 'phrase' | 'sentence';
  word_detail?: WordDetail | null;
  key_vocab?: Array<{
    word: string;
    ipa?: string;
    meaning?: string;
    part_of_speech?: string;
  }>;
  error?: string;
}

export interface RichDictionaryCardProps {
  result: TranslateResult | null;
  loading?: boolean;
  error?: string | null;
  onClose?: () => void;
  onSaveToBasket?: (word: string, meaning: string, detail?: WordDetail) => void;
  onAddToDifficulty?: (levelLabel: string, detail?: WordDetail) => void;
  onLookupWord?: (word: string) => void;
  isSaved?: boolean;
  className?: string;
  maxHeight?: string;
  showHeaderClose?: boolean;
}

export const RichDictionaryCard: React.FC<RichDictionaryCardProps> = ({
  result,
  loading = false,
  error = null,
  onClose,
  onSaveToBasket,
  onAddToDifficulty,
  onLookupWord,
  isSaved = false,
  className = '',
  maxHeight = 'max-h-[85vh]',
  showHeaderClose = true
}) => {
  const [activeTabId, setActiveTabId] = useState<string>('word');
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [savedInBasket, setSavedInBasket] = useState(isSaved);
  const [playingAccent, setPlayingAccent] = useState<'US' | 'UK' | null>(null);
  const [showDifficultyMenu, setShowDifficultyMenu] = useState(false);
  const [showCustomMeaningInput, setShowCustomMeaningInput] = useState(false);
  const [customMeaningText, setCustomMeaningText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setSavedInBasket(isSaved);
  }, [isSaved]);

  useEffect(() => {
    setActiveTabId('word');
    setIsCardFlipped(false);
  }, [result?.original_text]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const playSpeech = (text: string, accent: 'US' | 'UK') => {
    if (!text) return;
    setPlayingAccent(accent);

    const lang = accent === 'UK' ? 'en-GB' : 'en-US';
    const audioUrl = accent === 'UK' ? result?.word_detail?.audio_uk : result?.word_detail?.audio_us;

    if (audioUrl && audioUrl.startsWith('http')) {
      const audio = new Audio(audioUrl);
      audio.onended = () => setPlayingAccent(null);
      audio.onerror = () => {
        fallbackSynthesis(text, lang);
      };
      audio.play().catch(() => {
        fallbackSynthesis(text, lang);
      });
    } else {
      fallbackSynthesis(text, lang);
    }
  };

  const fallbackSynthesis = (text: string, lang: string) => {
    if (!window.speechSynthesis) {
      setPlayingAccent(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.onend = () => setPlayingAccent(null);
    utterance.onerror = () => setPlayingAccent(null);

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase()));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    window.speechSynthesis.speak(utterance);
  };

  const wordDetail = result?.word_detail;
  const currentCardTab = wordDetail?.card_tabs?.find((t) => t.id === activeTabId) || (wordDetail?.card_tabs ? wordDetail.card_tabs[0] : null);

  const handleSaveCard = (customMeaningOverride?: string) => {
    if (!result) return;
    const wordToSave = currentCardTab?.title || wordDetail?.word || result.original_text;
    const meaningToSave =
      customMeaningOverride ||
      currentCardTab?.meaning_vi ||
      wordDetail?.context_meaning ||
      result.translation;

    setSavedInBasket(true);
    if (onSaveToBasket) {
      onSaveToBasket(wordToSave, meaningToSave, wordDetail || undefined);
    }
    showToast(`Đã thêm thẻ "${wordToSave}" vào giỏ từ vựng!`);
  };

  const handleDifficultySelect = (levelLabel: string) => {
    setShowDifficultyMenu(false);
    handleSaveCard();
    if (onAddToDifficulty) {
      onAddToDifficulty(levelLabel, wordDetail || undefined);
    }
    showToast(`Đã lưu từ vào nhóm: ${levelLabel}`);
  };

  return (
    <div className={`bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col text-slate-800 font-sans select-text relative ${maxHeight} ${className}`}>
      {/* Top Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-white sticky top-0 z-20 shrink-0">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
              {wordDetail?.word || result?.original_text || 'Tra từ'}
            </h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-extrabold shadow-xs">
              <Sparkles className="w-3 h-3 text-blue-200" />
              AI
            </span>
          </div>

          {/* Pronunciation Row (US & UK) */}
          <div className="flex items-center gap-4 text-xs font-mono pt-0.5">
            <button
              type="button"
              onClick={() => playSpeech(wordDetail?.word || result?.original_text || '', 'US')}
              className={`flex items-center gap-1 font-semibold transition-colors cursor-pointer ${
                playingAccent === 'US' ? 'text-blue-600 scale-105' : 'text-slate-600 hover:text-blue-600'
              }`}
              title="Nghe phát âm chuẩn US"
            >
              <Volume2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-bold font-sans text-[11px] text-slate-400">US</span>
              <span>{wordDetail?.ipa_us || wordDetail?.ipa || '/.../'}</span>
            </button>

            <button
              type="button"
              onClick={() => playSpeech(wordDetail?.word || result?.original_text || '', 'UK')}
              className={`flex items-center gap-1 font-semibold transition-colors cursor-pointer ${
                playingAccent === 'UK' ? 'text-blue-600 scale-105' : 'text-slate-600 hover:text-blue-600'
              }`}
              title="Nghe phát âm chuẩn UK"
            >
              <Volume2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-bold font-sans text-[11px] text-slate-400">UK</span>
              <span>{wordDetail?.ipa_uk || wordDetail?.ipa || '/.../'}</span>
            </button>
          </div>
        </div>

        {showHeaderClose && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs scrollbar-thin">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="text-xs font-semibold text-slate-500">Đang phân tích từ điển AI...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2">
            <p className="font-semibold">{error}</p>
          </div>
        ) : result ? (
          <>
            {/* 1. Contextual Meaning Subheader */}
            <div className="text-xs font-bold text-blue-600">
              Nghĩa trong câu này · {wordDetail?.context_pos || wordDetail?.part_of_speech || 'noun'}
            </div>

            {/* 2. Interactive Flashcard Box with Tabs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  {wordDetail?.card_tabs && wordDetail.card_tabs.length > 0 ? (
                    wordDetail.card_tabs.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setActiveTabId(tab.id);
                          setIsCardFlipped(false);
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          activeTabId === tab.id
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {tab.tab_label}
                      </button>
                    ))
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-600 text-white">
                      Từ
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 font-medium shrink-0 flex items-center gap-1">
                  <RotateCw className="w-3 h-3 text-slate-400" />
                  <span>Bấm thẻ để lật</span>
                </div>
              </div>

              {/* Flashcard Surface */}
              <div
                onClick={() => setIsCardFlipped((prev) => !prev)}
                className="p-5 rounded-2xl border border-blue-200/90 bg-gradient-to-b from-blue-50/30 to-white hover:border-blue-400 hover:shadow-md transition-all duration-200 cursor-pointer text-center space-y-4 select-none group relative"
              >
                {!isCardFlipped ? (
                  <div className="space-y-1 animate-in fade-in duration-150">
                    <h3 className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                      {currentCardTab?.title || wordDetail?.word || result.original_text}
                    </h3>
                    <p className="text-xs text-slate-500 italic">
                      {currentCardTab?.subtitle || `${wordDetail?.part_of_speech || 'n'} · ${wordDetail?.ipa_us || wordDetail?.ipa || ''}`}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 animate-in fade-in duration-150">
                    <h3 className="text-xl font-black text-blue-700">
                      {currentCardTab?.meaning_vi || wordDetail?.context_meaning || result.translation}
                    </h3>
                    {currentCardTab?.example_en && (
                      <div className="text-[11px] text-slate-600 italic">
                        "{currentCardTab.example_en}"
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons on Card */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-center gap-3 pt-2"
                >
                  <button
                    type="button"
                    onClick={() => playSpeech(currentCardTab?.audio_text || wordDetail?.word || result.original_text, 'US')}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Nghe</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveCard()}
                    disabled={savedInBasket}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer ${
                      savedInBasket
                        ? 'bg-emerald-600 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {savedInBasket ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Đã thêm thẻ vào giỏ</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm thẻ vào giỏ</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* English Definition */}
              <div className="text-xs text-slate-600 leading-relaxed pt-1">
                {currentCardTab?.definition_en || wordDetail?.definition_en || 'a small technical problem or fault'}
              </div>
            </div>

            {/* 3. Cụm từ (Collocations) */}
            {wordDetail?.collocations && wordDetail.collocations.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 tracking-wide">Cụm từ</h4>
                <div className="space-y-1.5">
                  {wordDetail.collocations.map((col, idx) => (
                    <div
                      key={idx}
                      onClick={() => playSpeech(col.phrase, 'US')}
                      className="text-xs text-slate-700 hover:text-blue-600 transition-colors cursor-pointer flex items-baseline gap-1.5"
                      title="Bấm để nghe phát âm cụm từ"
                    >
                      <strong className="font-bold text-slate-900">{col.phrase}</strong>
                      <span className="text-slate-400">–</span>
                      <span className="text-slate-600">{col.meaning}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Đồng nghĩa (Synonyms) */}
            {wordDetail?.synonyms && wordDetail.synonyms.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 tracking-wide">Đồng nghĩa</h4>
                <div className="flex flex-wrap gap-2">
                  {wordDetail.synonyms.map((syn, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onLookupWord && onLookupWord(syn.word)}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200/80 text-xs text-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <strong className="font-bold">{syn.word}</strong>
                      {syn.meaning && (
                        <>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500 font-normal">{syn.meaning}</span>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Mẹo TOEIC (TOEIC Tip) */}
            {wordDetail?.toeic_tip && (
              <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200/80 space-y-1 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <span>💡</span>
                  <span>Mẹo TOEIC</span>
                </div>
                <p className="text-amber-950 leading-relaxed font-medium">
                  {wordDetail.toeic_tip}
                </p>
              </div>
            )}

            {/* 6. Nghĩa khác tham khảo (Other Meanings) */}
            {wordDetail?.other_meanings && wordDetail.other_meanings.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 tracking-wide">Nghĩa khác tham khảo</h4>
                <div className="space-y-2">
                  {wordDetail.other_meanings.map((om, idx) => (
                    <div key={idx} className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className="px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-mono">
                            {om.part_of_speech}
                          </span>
                          <span className="text-slate-800">{om.meaning}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSaveCard(om.meaning)}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                          + Thêm
                        </button>
                      </div>

                      {om.definition_en && (
                        <p className="text-[11px] text-slate-500 italic">{om.definition_en}</p>
                      )}

                      {om.example && (
                        <div className="text-xs space-y-0.5 text-slate-700 pt-1">
                          <p className="font-medium text-slate-900">"{om.example}"</p>
                          {om.example_vi && <p className="text-slate-500 text-[11px]">{om.example_vi}</p>}
                        </div>
                      )}
                    </div>
                  ))}

                  {showCustomMeaningInput ? (
                    <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-2">
                      <input
                        type="text"
                        value={customMeaningText}
                        onChange={(e) => setCustomMeaningText(e.target.value)}
                        placeholder="Nhập nghĩa riêng hoặc ghi chú ghi nhớ của bạn..."
                        className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                      />
                      <div className="flex items-center justify-end gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setShowCustomMeaningInput(false)}
                          className="px-2.5 py-1 text-slate-500 hover:text-slate-700 font-bold"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (customMeaningText.trim()) {
                              handleSaveCard(customMeaningText.trim());
                              setShowCustomMeaningInput(false);
                              setCustomMeaningText('');
                            }
                          }}
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg font-bold"
                        >
                          Lưu nghĩa riêng
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowCustomMeaningInput(true)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Thêm nghĩa riêng
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 7. Họ từ (Word Family) */}
            {wordDetail?.word_family && wordDetail.word_family.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 tracking-wide">Họ từ</h4>
                <div className="space-y-1">
                  {wordDetail.word_family.map((wf, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-700">
                      <strong className="text-slate-900 font-bold">{wf.word}</strong>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500 italic font-semibold">{wf.part_of_speech}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-700">{wf.meaning}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Vocab in phrase / sentence */}
            {result.key_vocab && result.key_vocab.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 tracking-wide">Từ vựng TOEIC trong câu</h4>
                <div className="flex flex-wrap gap-1.5">
                  {result.key_vocab.map((kv, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onLookupWord && onLookupWord(kv.word)}
                      className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-xs font-bold text-blue-700 transition-colors flex items-center gap-1 cursor-pointer"
                      title={kv.meaning}
                    >
                      <span>{kv.word}</span>
                      {kv.ipa && <span className="text-[10px] text-blue-500 font-normal">/{kv.ipa}/</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Footer Bar: Thêm vào Luyện theo độ khó */}
      {result && (
        <div className="p-3.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-2 relative shrink-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDifficultyMenu((prev) => !prev)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5 text-blue-600" />
              <span>Thêm vào <strong>Luyện theo độ khó</strong></span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showDifficultyMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl p-1.5 space-y-1 z-30 animate-in fade-in duration-150">
                {[
                  { label: 'Cơ bản (Band 450 - Dễ)', color: 'text-emerald-700' },
                  { label: 'Tiêu chuẩn (Band 650 - Vừa)', color: 'text-blue-700' },
                  { label: 'Nâng cao (Band 850+ - Khó)', color: 'text-purple-700' },
                  { label: 'Sổ Flashcards cá nhân', color: 'text-amber-700' },
                ].map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleDifficultySelect(opt.label)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors flex items-center justify-between ${opt.color} cursor-pointer`}
                  >
                    <span>{opt.label}</span>
                    <Plus className="w-3 h-3 text-slate-400" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              const textToCopy = result?.translation || result?.original_text || '';
              if (textToCopy) {
                navigator.clipboard.writeText(textToCopy);
                showToast('Đã sao chép nghĩa vào Clipboard!');
              }
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white transition-colors cursor-pointer"
            title="Sao chép bản dịch"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-slate-900/90 text-white text-xs font-bold shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150 flex items-center gap-1.5 z-40">
          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
