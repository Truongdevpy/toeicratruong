import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { RichDictionaryCard, TranslateResult, WordDetail } from './RichDictionaryCard';

export const SelectionTranslator: React.FC = () => {
  const [selectedText, setSelectedText] = useState('');
  const [sentenceContext, setSentenceContext] = useState('');
  const [buttonPos, setButtonPos] = useState<{ x: number; y: number } | null>(null);
  const [popupPos, setPopupPos] = useState<{ x: number; y: number; placeAbove: boolean } | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranslateResult | null>(null);
  const [savedInBasket, setSavedInBasket] = useState(false);

  const popupRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const handleSelectionChange = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      if (!isOpen) {
        setButtonPos(null);
      }
      return;
    }

    const text = sel.toString().trim();
    if (!text || text.length < 2) {
      if (!isOpen) setButtonPos(null);
      return;
    }

    if (popupRef.current && popupRef.current.contains(sel.anchorNode)) return;
    if (triggerRef.current && triggerRef.current.contains(sel.anchorNode)) return;

    try {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      setSelectedText(text);

      let fullSentence = '';
      if (sel.anchorNode) {
        const parentElem = sel.anchorNode.parentElement?.closest('p, div, li, span, h1, h2, h3, h4, td');
        const nodeText = (parentElem?.textContent || sel.anchorNode.textContent || '').trim();
        if (nodeText) {
          const sentences = nodeText.split(/(?<=[.?!])\s+/);
          const found = sentences.find((s) => s.toLowerCase().includes(text.toLowerCase()));
          fullSentence = (found || nodeText.slice(0, 300)).trim();
        }
      }
      setSentenceContext(fullSentence);

      const viewportWidth = window.innerWidth;
      const x = Math.max(16, Math.min(viewportWidth - 90, rect.left + rect.width / 2 - 40));
      const placeAbove = rect.top > 60;
      const y = placeAbove ? rect.top - 42 : rect.bottom + 8;

      setButtonPos({ x, y: y + window.scrollY });
    } catch {
      // Ignore
    }
  }, [isOpen]);

  const fetchTranslate = useCallback(async (textToTranslate: string, sentenceOverride?: string) => {
    const text = textToTranslate.trim();
    if (!text) return;

    setLoading(true);
    setError(null);
    setSavedInBasket(false);

    try {
      const res: TranslateResult = await api.translateLookup({
        text,
        sentence: sentenceOverride || sentenceContext || ''
      });
      setResult(res);

      try {
        const stored = localStorage.getItem('toeic_saved_vocab');
        if (stored) {
          const parsed = JSON.parse(stored);
          const exists = parsed.some((v: any) => v.word.toLowerCase() === text.toLowerCase());
          if (exists) setSavedInBasket(true);
        }
      } catch {}
    } catch {
      setError('Không thể kết nối đến máy chủ dịch. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [sentenceContext]);

  useEffect(() => {
    const handleMouseUp = () => {
      setTimeout(handleSelectionChange, 20);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Shift'].includes(e.key)) {
        setTimeout(handleSelectionChange, 20);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popupRef.current &&
        !popupRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
        setButtonPos(null);
      }
    };

    const handleGlobalOpen = (e: any) => {
      const text = e.detail?.text;
      const sentence = e.detail?.sentence || '';
      if (text) {
        setSelectedText(text);
        setSentenceContext(sentence);
        setIsOpen(true);
        const modalWidth = Math.min(410, window.innerWidth - 32);
        setPopupPos({
          x: Math.max(16, (window.innerWidth - modalWidth) / 2),
          y: Math.max(70, window.scrollY + 80),
          placeAbove: false,
        });
        fetchTranslate(text, sentence);
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('toeic:open-translator' as any, handleGlobalOpen);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('toeic:open-translator' as any, handleGlobalOpen);
    };
  }, [handleSelectionChange, fetchTranslate]);

  const handleOpenTranslate = async (wordOverride?: string) => {
    const text = wordOverride || selectedText;
    if (!text.trim()) return;

    if (buttonPos) {
      const viewportWidth = window.innerWidth;
      const modalWidth = Math.min(410, viewportWidth - 32);
      let px = buttonPos.x - modalWidth / 2 + 30;
      px = Math.max(16, Math.min(viewportWidth - modalWidth - 16, px));
      const py = buttonPos.y + 36;
      setPopupPos({ x: px, y: py, placeAbove: false });
    } else {
      const modalWidth = Math.min(410, window.innerWidth - 32);
      setPopupPos({
        x: Math.max(16, (window.innerWidth - modalWidth) / 2),
        y: Math.max(70, window.scrollY + 80),
        placeAbove: false,
      });
    }

    setIsOpen(true);
    setButtonPos(null);
    await fetchTranslate(text);
  };

  const handleAddCardToBasket = async (wordToSave: string, meaningToSave: string, detail?: WordDetail) => {
    setSavedInBasket(true);
    try {
      const stored = localStorage.getItem('toeic_saved_vocab');
      const list = stored ? JSON.parse(stored) : [];
      if (!list.some((item: any) => item.word.toLowerCase() === wordToSave.toLowerCase())) {
        list.push({
          word: wordToSave,
          meaning: meaningToSave,
          context: result?.sentence || sentenceContext || '',
          savedAt: new Date().toLocaleDateString('vi-VN')
        });
        localStorage.setItem('toeic_saved_vocab', JSON.stringify(list));
      }
    } catch {}

    try {
      await api.addToFlashcards({
        word: wordToSave,
        meaning: meaningToSave,
        ipa: detail?.ipa_us || detail?.ipa || '',
        part_of_speech: detail?.context_pos || detail?.part_of_speech || 'n',
        example: detail?.example || '',
        audio_url: detail?.audio_us || '',
        source_context: result?.sentence || sentenceContext || ''
      });
    } catch {
      // Ignored
    }
  };

  const handleAddToDifficulty = async (levelLabel: string, detail?: WordDetail) => {
    if (!result) return;
    const word = detail?.word || result.original_text;
    const meaning = detail?.meaning || result.translation;
    await handleAddCardToBasket(word, meaning, detail);
  };

  return (
    <>
      {buttonPos && !isOpen && (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => handleOpenTranslate()}
          style={{
            position: 'absolute',
            left: `${buttonPos.x}px`,
            top: `${buttonPos.y}px`,
            zIndex: 99999,
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white hover:bg-blue-600 shadow-xl border border-slate-700 hover:border-blue-500 text-xs font-bold transition-all duration-150 animate-in fade-in zoom-in-95 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>Dịch</span>
        </button>
      )}

      {isOpen && (
        <div
          ref={popupRef}
          role="dialog"
          aria-label="Cửa sổ dịch từ vựng TOEIC"
          style={{
            position: 'absolute',
            left: popupPos ? `${popupPos.x}px` : '50%',
            top: popupPos ? `${popupPos.y}px` : '100px',
            transform: popupPos ? 'none' : 'translateX(-50%)',
            zIndex: 999999,
          }}
          className="w-[92vw] sm:w-[410px]"
        >
          <RichDictionaryCard
            result={result}
            loading={loading}
            error={error}
            onClose={() => {
              setIsOpen(false);
              setButtonPos(null);
            }}
            onSaveToBasket={handleAddCardToBasket}
            onAddToDifficulty={handleAddToDifficulty}
            onLookupWord={(word) => handleOpenTranslate(word)}
            isSaved={savedInBasket}
          />
        </div>
      )}
    </>
  );
};
