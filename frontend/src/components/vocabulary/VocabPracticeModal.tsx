import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Heart,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Volume2,
  Mic,
  MicOff,
  Flame,
  Award,
  FastForward
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { VocabLessonNode } from '../../types/vocabDuo';
import { VocabWord } from '../../types';

export interface VocabPracticeModalProps {
  node: VocabLessonNode;
  words: VocabWord[];
  hearts: number;
  isVip?: boolean;
  onClose: () => void;
  onComplete: (earnedXp: number, stars: number) => void;
}

export const VocabPracticeModal: React.FC<VocabPracticeModalProps> = ({
  node,
  words,
  hearts: initialHearts,
  isVip = false,
  onClose,
  onComplete
}) => {
  const [hearts, setHearts] = useState(initialHearts);
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [typedInput, setTypedInput] = useState('');
  const [scoreCount, setScoreCount] = useState(0);
  type ExerciseMode = 'card' | 'mcq' | 'fill' | 'speak';
  const [exerciseMode, setExerciseMode] = useState<ExerciseMode>('card');

  // Micro & Speech Recognition state for VOC-02
  const [isRecording, setIsRecording] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [speechScore, setSpeechScore] = useState<number | null>(null);
  const [speechAttempts, setSpeechAttempts] = useState(0);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Take words for this node (6 to 10 words per lesson)
  const lessonWords = React.useMemo(() => {
    if (!words || words.length === 0) {
      return [
        {
          id: 'fb1',
          word: 'contract',
          ipa: 'kɒntrækt',
          part_of_speech: 'noun',
          meaning: 'hợp đồng, giao kèo',
          example: 'They signed a contract for the new project.',
          example_vi: 'Họ đã ký hợp đồng cho dự án mới.'
        },
        {
          id: 'fb2',
          word: 'negotiate',
          ipa: 'nɪˈɡoʊʃieɪt',
          part_of_speech: 'verb',
          meaning: 'đàm phán, thương lượng',
          example: 'We negotiated the price down.',
          example_vi: 'Chúng tôi đã thương lượng để giảm giá.'
        },
        {
          id: 'fb3',
          word: 'agreement',
          ipa: 'əˈɡriːmənt',
          part_of_speech: 'noun',
          meaning: 'thỏa thuận, sự đồng thuận',
          example: 'Both sides reached an agreement.',
          example_vi: 'Cả hai bên đã đạt được sự thỏa thuận.'
        },
        {
          id: 'fb4',
          word: 'obligate',
          ipa: 'ˈɑːblɪɡeɪt',
          part_of_speech: 'verb',
          meaning: 'bắt buộc, có nghĩa vụ',
          example: 'The client is obligated to pay.',
          example_vi: 'Khách hàng có nghĩa vụ thanh toán.'
        },
        {
          id: 'fb5',
          word: 'provision',
          ipa: 'prəˈvɪʒn',
          part_of_speech: 'noun',
          meaning: 'điều khoản trong hợp đồng',
          example: 'The contract includes a cancel provision.',
          example_vi: 'Hợp đồng gồm điều khoản hủy bỏ.'
        },
        {
          id: 'fb6',
          word: 'specify',
          ipa: 'ˈspesɪfaɪ',
          part_of_speech: 'verb',
          meaning: 'chỉ rõ, ghi rõ',
          example: 'The terms specify the delivery date.',
          example_vi: 'Các điều khoản chỉ rõ ngày giao hàng.'
        }
      ];
    }
    // Pick 6-10 words
    const count = Math.min(Math.max(node.wordCount || 6, 6), 10);
    const start = (node.nodeIndex * count) % Math.max(words.length - count, 1);
    return words.slice(start, start + count);
  }, [words, node.wordCount, node.nodeIndex]);

  const currentWord = lessonWords[stepIndex] || lessonWords[0];
  const isLastStep = stepIndex >= lessonWords.length - 1;

  // Options for MCQ step
  const options = React.useMemo(() => {
    if (!currentWord) return [];
    const others = lessonWords.filter((w) => w.id !== currentWord.id).map((w) => w.meaning);
    const shuffledOthers = others.sort(() => 0.5 - Math.random()).slice(0, 3);
    const combined = [currentWord.meaning, ...shuffledOthers];
    return combined.sort(() => 0.5 - Math.random());
  }, [currentWord, lessonWords]);

  // Voice Speech Recognition init
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSpeechTranscript(transcript);
        evaluateSpeech(transcript);
      };

      recognition.onerror = (event: any) => {
        setIsRecording(false);
        setSpeechError(`Lỗi mic: ${event.error}. Bạn có thể bấm Thử lại hoặc Bỏ qua.`);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [currentWord]);

  // Speech evaluation
  const evaluateSpeech = (spoken: string) => {
    const target = currentWord.word.toLowerCase().trim();
    const cleanSpoken = spoken.toLowerCase().trim();

    let score = 0;
    if (cleanSpoken.includes(target) || target.includes(cleanSpoken)) {
      score = 95;
    } else {
      let matchCount = 0;
      for (let i = 0; i < Math.min(target.length, cleanSpoken.length); i++) {
        if (target[i] === cleanSpoken[i]) matchCount++;
      }
      score = Math.round((matchCount / Math.max(target.length, 1)) * 100);
    }

    setSpeechScore(score);
    const attempts = speechAttempts + 1;
    setSpeechAttempts(attempts);

    const passed = score >= 70;
    if (passed) {
      setIsCorrect(true);
      setIsAnswerChecked(true);
      setScoreCount((c) => c + 1);
    } else if (attempts >= 3) {
      setIsCorrect(false);
      setIsAnswerChecked(true);
      if (!isVip) setHearts((h) => Math.max(0, h - 1));
    }
  };

  const playWordAudio = () => {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(currentWord.word);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }
    } catch {}
  };

  const handleSelectOption = (opt: string) => {
    if (isAnswerChecked) return;
    setSelectedOption(opt);
    const correct = opt === currentWord.meaning;
    setIsCorrect(correct);
    setIsAnswerChecked(true);

    if (correct) {
      setScoreCount((c) => c + 1);
    } else {
      if (!isVip) {
        setHearts((h) => Math.max(0, h - 1));
      }
    }
  };

  const handleCheckTyped = () => {
    if (isAnswerChecked || !typedInput.trim()) return;
    const cleanUser = typedInput.trim().toLowerCase();
    const cleanTarget = currentWord.word.trim().toLowerCase();
    const correct = cleanUser === cleanTarget;
    setIsCorrect(correct);
    setIsAnswerChecked(true);

    if (correct) {
      setScoreCount((c) => c + 1);
    } else {
      if (!isVip) {
        setHearts((h) => Math.max(0, h - 1));
      }
    }
  };

  const handleSkipSpeech = () => {
    setIsCorrect(true);
    setIsAnswerChecked(true);
  };

  const handleNextStep = () => {
    if (exerciseMode === 'card') {
      setExerciseMode('mcq');
      setIsAnswerChecked(false);
      setIsCorrect(false);
      return;
    }
    if (exerciseMode === 'mcq') {
      setExerciseMode('fill');
      setIsAnswerChecked(false);
      setIsCorrect(false);
      setTypedInput('');
      return;
    }
    if (exerciseMode === 'fill') {
      setExerciseMode('speak');
      setIsAnswerChecked(false);
      setIsCorrect(false);
      setSpeechTranscript('');
      setSpeechScore(null);
      setSpeechAttempts(0);
      setSpeechError(null);
      return;
    }
    if (isLastStep) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      const stars = scoreCount >= lessonWords.length * 2.5 ? 3 : scoreCount >= lessonWords.length * 1.5 ? 2 : 1;
      onComplete(node.xpReward, stars);
    } else {
      setStepIndex((i) => i + 1);
      setExerciseMode('card');
      setSelectedOption(null);
      setIsAnswerChecked(false);
      setIsCorrect(false);
      setTypedInput('');
      setSpeechTranscript('');
      setSpeechScore(null);
      setSpeechAttempts(0);
      setSpeechError(null);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsRecording(false);
    } else {
      setSpeechError(null);
      setSpeechScore(null);
      setSpeechTranscript('');
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (err: any) {
        setSpeechError('Không thể khởi động micro. Vui lòng cấp quyền micro cho trình duyệt!');
      }
    }
  };

  return (
    <div
      data-testid="vocab-practice-modal"
      className="fixed inset-0 z-50 bg-[#131F24] flex flex-col select-none overflow-hidden animate-in fade-in duration-200"
    >
      {/* Fullscreen Header */}
      <div className="w-full max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Progress bar */}
        <div className="flex-1 mx-2">
          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-700">
            <div
              className="bg-[#58CC02] h-full rounded-full transition-all duration-300"
              style={{ width: `${((stepIndex + 1) / lessonWords.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Hearts counter */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 text-rose-400 rounded-2xl font-black text-xs border border-rose-500/30">
          <Heart className="w-4 h-4 fill-current text-rose-500" />
          <span>{isVip ? '∞' : hearts}</span>
        </div>
      </div>

      {/* Main Fullscreen Body */}
      <div className="w-full max-w-xl mx-auto flex-1 flex flex-col justify-center px-4 py-6 overflow-y-auto">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center mb-4">
          {node.title} • Từ {stepIndex + 1}/{lessonWords.length}
        </div>

        {/* 1. THEORY FLASHCARD */}
        {exerciseMode === 'card' && (
          <div className="space-y-6 text-center">
            <div className="p-8 rounded-3xl bg-slate-800/80 border-2 border-slate-700 shadow-xl space-y-4">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-wider border border-emerald-500/30">
                {currentWord.part_of_speech || 'noun'}
              </span>
              <h3 className="text-4xl font-black text-white tracking-tight flex items-center justify-center gap-3">
                <span>{currentWord.word}</span>
                <button
                  type="button"
                  onClick={playWordAudio}
                  className="p-2 rounded-2xl bg-slate-700 hover:bg-slate-600 text-emerald-400 hover:scale-105 transition-all cursor-pointer"
                >
                  <Volume2 className="w-6 h-6" />
                </button>
              </h3>
              {currentWord.ipa && (
                <div className="text-sm font-mono text-emerald-300 font-semibold">
                  /{currentWord.ipa}/
                </div>
              )}
              <div className="pt-3 text-xl font-bold text-white border-t border-slate-700">
                {currentWord.meaning}
              </div>
            </div>

            {currentWord.example && (
              <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/80 text-left text-xs space-y-1 text-slate-300">
                <div className="font-semibold text-white">Ví dụ: "{currentWord.example}"</div>
                {currentWord.example_vi && (
                  <div className="text-slate-400 italic">Dịch: "{currentWord.example_vi}"</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 2. PRACTICE MCQ */}
        {exerciseMode === 'mcq' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-3xl font-black text-white">{currentWord.word}</h3>
              <p className="text-xs text-slate-400">Chọn nghĩa tiếng Việt chính xác:</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {options.map((opt, i) => {
                const isOptSelected = selectedOption === opt;
                let style = 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700/80';

                if (isAnswerChecked) {
                  if (opt === currentWord.meaning) {
                    style = 'border-[#58CC02] bg-[#58CC02]/20 text-white font-bold ring-2 ring-[#58CC02]';
                  } else if (isOptSelected && !isCorrect) {
                    style = 'border-rose-500 bg-rose-500/20 text-rose-200';
                  }
                }

                return (
                  <button
                    key={i}
                    type="button"
                    disabled={isAnswerChecked}
                    onClick={() => handleSelectOption(opt)}
                    className={`p-4 rounded-2xl border-2 text-sm text-left transition-all cursor-pointer ${style}`}
                  >
                    <span className="font-bold mr-2 text-slate-400">{String.fromCharCode(65 + i)}.</span>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. PRONUNCIATION / MICRO CHECK (VOC-02) */}
        {exerciseMode === 'speak' && (
          <div className="space-y-6 text-center">
            <div className="space-y-2">
              <span className="text-[11px] font-black text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30 uppercase tracking-wider">
                Luyện đọc từ bằng Micro
              </span>
              <h3 className="text-4xl font-black text-white mt-2">{currentWord.word}</h3>
              {currentWord.ipa && (
                <p className="text-sm font-mono text-emerald-300 font-semibold">/{currentWord.ipa}/</p>
              )}
              <p className="text-xs text-slate-400 mt-1">Nghĩa: {currentWord.meaning}</p>
            </div>

            <div className="flex flex-col items-center justify-center space-y-4 py-4">
              <button
                type="button"
                onClick={toggleRecording}
                data-testid="vocab-mic-btn"
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xl ${
                  isRecording
                    ? 'bg-rose-500 text-white animate-pulse ring-8 ring-rose-500/30'
                    : 'bg-[#58CC02] text-white hover:bg-[#46A302] hover:scale-105 shadow-[#58CC02]/30'
                }`}
              >
                {isRecording ? <MicOff className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
              </button>

              <div className="text-xs font-semibold text-slate-300">
                {isRecording ? (
                  <span className="text-rose-400 font-bold animate-pulse">Đang nghe... Nói từ rõ ràng</span>
                ) : (
                  <span>Bấm vào Micro để nói (Thử lại: {speechAttempts}/3)</span>
                )}
              </div>

              {speechTranscript && (
                <div className="px-4 py-2 bg-slate-800 rounded-xl text-xs text-slate-300 border border-slate-700">
                  Bạn đã đọc: <b className="text-white font-mono">"{speechTranscript}"</b>
                </div>
              )}

              {speechScore !== null && (
                <div
                  className={`px-4 py-2 rounded-2xl text-xs font-black border ${
                    speechScore >= 70
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                  }`}
                >
                  Điểm phát âm: {speechScore}/100 {speechScore >= 70 ? '🎉 ĐẠT' : '⚠️ CHƯA ĐẠT (yêu cầu ≥70)'}
                </div>
              )}

              {speechError && (
                <div className="text-xs text-amber-300 bg-amber-500/20 p-3 rounded-2xl border border-amber-500/30">
                  {speechError}
                </div>
              )}

              {/* Nút Bỏ qua nói */}
              <button
                type="button"
                onClick={handleSkipSpeech}
                className="text-xs text-slate-400 hover:text-white underline font-semibold cursor-pointer pt-2"
              >
                Bỏ qua phần đọc từ này →
              </button>
            </div>
          </div>
        )}

        {/* 4. CHECKPOINT / TYPING */}
        {exerciseMode === 'fill' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <span className="text-[11px] font-black text-amber-400 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30 uppercase">
                Thử thách gõ từ vựng
              </span>
              <p className="text-sm font-semibold text-slate-300 mt-2">Nghĩa tiếng Việt:</p>
              <h4 className="text-2xl font-black text-[#58CC02]">{currentWord.meaning}</h4>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                value={typedInput}
                disabled={isAnswerChecked}
                onChange={(e) => setTypedInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCheckTyped()}
                placeholder="Gõ từ tiếng Anh..."
                className="w-full px-4 py-3.5 text-center text-lg font-bold rounded-2xl border-2 border-slate-700 bg-slate-800 text-white focus:border-[#58CC02] focus:outline-hidden"
              />

              {!isAnswerChecked && (
                <button
                  type="button"
                  onClick={handleCheckTyped}
                  disabled={!typedInput.trim()}
                  className="w-full py-3.5 bg-[#58CC02] hover:bg-[#46A302] text-white font-black text-xs uppercase tracking-wider rounded-2xl cursor-pointer disabled:opacity-40"
                >
                  KIỂM TRA
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Footer Feedback Bar */}
      <div
        className={`w-full py-4 px-6 border-t transition-all flex items-center justify-between ${
          isAnswerChecked
            ? isCorrect
              ? 'bg-[#58CC02]/20 border-[#58CC02]/40 text-white'
              : 'bg-rose-500/20 border-rose-500/40 text-white'
            : 'bg-[#131F24] border-slate-800'
        }`}
      >
        <div className="w-full max-w-3xl mx-auto flex items-center justify-between">
          {isAnswerChecked ? (
            <div className="flex items-center gap-3">
              {isCorrect ? (
                <>
                  <CheckCircle2 className="w-8 h-8 text-[#58CC02] shrink-0" />
                  <div>
                    <div className="text-sm font-black text-[#58CC02]">Chính xác! Xuất sắc lắm!</div>
                    <div className="text-xs text-slate-300">Từ: {currentWord.word}</div>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-8 h-8 text-rose-500 shrink-0" />
                  <div>
                    <div className="text-sm font-black text-rose-400">Chưa chính xác</div>
                    <div className="text-xs text-slate-300">Đáp án đúng: <b className="text-white">{currentWord.word}</b> ({currentWord.meaning})</div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div />
          )}

          {(isAnswerChecked || exerciseMode === 'card') && (
            <button
              type="button"
              onClick={handleNextStep}
              className={`px-8 py-3 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center gap-2 ${
                isCorrect || exerciseMode === 'card'
                  ? 'bg-[#58CC02] hover:bg-[#46A302] text-white'
                  : 'bg-rose-500 hover:bg-rose-600 text-white'
              }`}
            >
              <span>{isLastStep ? 'HOÀN THÀNH' : 'TIẾP TỤC'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
