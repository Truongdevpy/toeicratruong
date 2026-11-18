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
  Award
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

  // Micro & Speech Recognition state for VOC-02
  const [isRecording, setIsRecording] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [speechScore, setSpeechScore] = useState<number | null>(null);
  const [speechAttempts, setSpeechAttempts] = useState(0);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Take words for this node
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
          ipa: 'nɪɡoʊʃieɪt',
          part_of_speech: 'verb',
          meaning: 'đàm phán, thương lượng',
          example: 'We need to negotiate the terms of payment.',
          example_vi: 'Chúng ta cần thương lượng các điều khoản thanh toán.'
        },
        {
          id: 'fb3',
          word: 'agreement',
          ipa: 'əɡriːmənt',
          part_of_speech: 'noun',
          meaning: 'sự thỏa thuận, hợp đồng',
          example: 'Both sides reached an agreement.',
          example_vi: 'Cả hai bên đã đạt được thỏa thuận.'
        }
      ] as VocabWord[];
    }
    const count = Math.min(node.wordCount || 5, words.length);
    const start = (node.nodeIndex * 5) % words.length;
    let slice = words.slice(start, start + count);
    if (slice.length < 3) {
      slice = words.slice(0, 5);
    }
    return slice;
  }, [words, node]);

  const currentWord = lessonWords[stepIndex] || lessonWords[0];
  const isLastStep = stepIndex >= lessonWords.length - 1;

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  // Keyboard shortcut listener: Space to toggle mic (on pronunciation node), Enter to next
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && node.type === 'collocations' && !isAnswerChecked) {
        e.preventDefault();
        toggleRecording();
      } else if (e.code === 'Enter' && isAnswerChecked) {
        e.preventDefault();
        handleNextStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [node.type, isAnswerChecked, isRecording, speechAttempts]);

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = () => {
    setSpeechError(null);
    setSpeechTranscript('');
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError('Trình duyệt không hỗ trợ Web Speech API. Tự động chấm đạt chuẩn mẫu.');
      setSpeechScore(85);
      setIsCorrect(true);
      setIsAnswerChecked(true);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript?.trim() || '';
        setSpeechTranscript(transcript);
        evaluateSpeech(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('Không có quyền micro. Vui lòng cấp quyền micro.');
        } else if (event.error === 'no-speech') {
          setSpeechError('Không nghe thấy giọng nói (im lặng). Vui lòng thử lại!');
        } else {
          setSpeechError('Lỗi thu âm: ' + event.error);
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch (err: any) {
      setSpeechError('Không thể khởi tạo micro: ' + (err?.message || 'Lỗi không xác định'));
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsRecording(false);
  };

  const evaluateSpeech = (transcript: string) => {
    setIsRecording(false);
    const target = (currentWord.word || '').trim().toLowerCase();
    const spoken = transcript.trim().toLowerCase();

    let score = 0;
    if (spoken === target) {
      score = 100;
    } else if (spoken.includes(target) || target.includes(spoken)) {
      score = 85;
    } else {
      let matchCount = 0;
      for (let i = 0; i < Math.min(target.length, spoken.length); i++) {
        if (target[i] === spoken[i]) matchCount++;
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
    if (isAnswerChecked) return;
    const cleanInput = typedInput.trim().toLowerCase();
    const cleanTarget = (currentWord.word || '').trim().toLowerCase();
    const correct = cleanInput === cleanTarget;

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

  const handleNextStep = () => {
    if (isLastStep) {
      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch {}

      const stars = scoreCount >= lessonWords.length * 0.8 ? 3 : scoreCount >= lessonWords.length * 0.5 ? 2 : 1;
      onComplete(node.xpReward, stars);
      return;
    }

    setStepIndex((idx) => idx + 1);
    setSelectedOption(null);
    setIsAnswerChecked(false);
    setIsCorrect(false);
    setTypedInput('');
    setSpeechTranscript('');
    setSpeechScore(null);
    setSpeechAttempts(0);
    setSpeechError(null);
  };

  const distractors = React.useMemo(() => {
    return lessonWords
      .filter((w) => w.word !== currentWord.word)
      .slice(0, 3)
      .map((w) => w.meaning);
  }, [lessonWords, currentWord]);

  const options = React.useMemo(() => {
    const list = [currentWord.meaning, ...distractors];
    return list.sort(() => 0.5 - Math.random());
  }, [currentWord, distractors]);

  return (
    <div
      data-testid="vocab-practice-modal"
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Progress bar */}
          <div className="flex-1 mx-4">
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${((stepIndex + 1) / lessonWords.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Hearts counter */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 rounded-full font-bold text-xs border border-rose-200">
            <Heart className="w-4 h-4 fill-current" />
            <span>{isVip ? '∞' : hearts}</span>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Node Badge */}
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span className="uppercase tracking-wider">
              {node.title} • Câu {stepIndex + 1}/{lessonWords.length}
            </span>
            <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 font-bold">
              <Flame className="w-3.5 h-3.5" /> +{node.xpReward} XP
            </span>
          </div>

          {/* NODE TYPE 1: THEORY / FLASHCARD */}
          {node.type === 'theory' && (
            <div className="space-y-6 text-center">
              <div className="p-8 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 shadow-xs space-y-3">
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                  {currentWord.part_of_speech || 'noun'}
                </span>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-2">
                  <span>{currentWord.word}</span>
                  <button
                    type="button"
                    onClick={playWordAudio}
                    className="p-1.5 rounded-xl bg-white/80 hover:bg-white text-emerald-600 shadow-2xs hover:scale-105 transition-all cursor-pointer"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                </h3>
                {currentWord.ipa && (
                  <div className="text-sm font-mono text-emerald-700 font-semibold">
                    /{currentWord.ipa}/
                  </div>
                )}
                <div className="pt-2 text-lg font-bold text-slate-800 border-t border-emerald-200/60">
                  {currentWord.meaning}
                </div>
              </div>

              {currentWord.example && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-left text-xs space-y-1">
                  <div className="font-semibold text-slate-700">Ví dụ: "{currentWord.example}"</div>
                  {currentWord.example_vi && (
                    <div className="text-slate-500 italic">Dịch: "{currentWord.example_vi}"</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* NODE TYPE 2: PRACTICE MCQ */}
          {node.type === 'practice_basic' && (
            <div className="space-y-5">
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-slate-900">{currentWord.word}</h3>
                <p className="text-xs text-slate-500">Chọn nghĩa tiếng Việt chính xác:</p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {options.map((opt, i) => {
                  const isOptSelected = selectedOption === opt;
                  let style = 'border-slate-200 hover:border-slate-300 bg-white text-slate-700';

                  if (isAnswerChecked) {
                    if (opt === currentWord.meaning) {
                      style = 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold';
                    } else if (isOptSelected && !isCorrect) {
                      style = 'border-rose-500 bg-rose-50 text-rose-950';
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
                      <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* NODE TYPE 3: PRONUNCIATION / MICRO CHECK (VOC-02) */}
          {node.type === 'collocations' && (
            <div className="space-y-6 text-center">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 uppercase">
                  VOC-02 • Luyện đọc phát âm
                </span>
                <h3 className="text-3xl font-black text-slate-900 mt-2">{currentWord.word}</h3>
                {currentWord.ipa && (
                  <p className="text-sm font-mono text-slate-500 font-semibold">/{currentWord.ipa}/</p>
                )}
                <p className="text-xs text-slate-400 mt-1">Nghĩa: {currentWord.meaning}</p>
              </div>

              {/* Mic action button */}
              <div className="flex flex-col items-center justify-center space-y-3 py-2">
                <button
                  type="button"
                  onClick={toggleRecording}
                  data-testid="vocab-mic-btn"
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg ${
                    isRecording
                      ? 'bg-rose-500 text-white animate-pulse ring-4 ring-rose-200'
                      : 'bg-emerald-500 text-white hover:bg-emerald-600 hover:scale-105'
                  }`}
                >
                  {isRecording ? <MicOff className="w-9 h-9" /> : <Mic className="w-9 h-9" />}
                </button>

                <div className="text-xs font-semibold text-slate-600">
                  {isRecording ? (
                    <span className="text-rose-600 font-bold">Đang nghe... Nói từ rõ ràng</span>
                  ) : (
                    <span>Bấm hoặc nhấn <b>Space</b> để nói (Thử lại: {speechAttempts}/3)</span>
                  )}
                </div>

                {speechTranscript && (
                  <div className="px-4 py-2 bg-slate-100 rounded-xl text-xs text-slate-700">
                    Bạn đã đọc: <b className="text-slate-900 font-mono">"{speechTranscript}"</b>
                  </div>
                )}

                {speechScore !== null && (
                  <div
                    className={`px-4 py-1.5 rounded-full text-xs font-black border ${
                      speechScore >= 70
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-rose-50 text-rose-700 border-rose-300'
                    }`}
                  >
                    Điểm phát âm: {speechScore}/100 {speechScore >= 70 ? '🎉 ĐẠT' : '⚠️ CHƯA ĐẠT (≥70)'}
                  </div>
                )}

                {speechError && (
                  <div className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                    {speechError}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* NODE TYPE 4: CHECKPOINT / TYPING */}
          {node.type === 'checkpoint' && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 uppercase">
                  Chốt Unit • Thử thách gõ từ
                </span>
                <p className="text-sm font-semibold text-slate-700 mt-2">Nghĩa tiếng Việt:</p>
                <h4 className="text-xl font-black text-emerald-700">{currentWord.meaning}</h4>
                <p className="text-xs text-slate-400">Gõ đúng từ tiếng Anh tương ứng:</p>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={typedInput}
                  disabled={isAnswerChecked}
                  onChange={(e) => setTypedInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCheckTyped()}
                  placeholder="Gõ từ tiếng Anh..."
                  className="w-full px-4 py-3 text-center text-lg font-bold rounded-2xl border-2 border-slate-300 focus:border-emerald-500 focus:outline-hidden"
                />

                {!isAnswerChecked && (
                  <button
                    type="button"
                    onClick={handleCheckTyped}
                    disabled={!typedInput.trim()}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    Kiểm tra
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer / Feedback Bar */}
        <div
          className={`p-4 border-t transition-all flex items-center justify-between ${
            node.type === 'theory'
              ? 'bg-white border-slate-100'
              : isAnswerChecked
              ? isCorrect
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-rose-50 border-rose-200 text-rose-950'
              : 'bg-white border-slate-100'
          }`}
        >
          {node.type === 'theory' ? (
            <div className="flex-1 flex justify-end">
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>{isLastStep ? 'Hoàn thành' : 'Tiếp tục (Enter)'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : isAnswerChecked ? (
            <>
              <div className="flex items-center gap-2">
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div>
                      <div className="text-xs font-black text-emerald-800">Chính xác! Xuất sắc lắm!</div>
                      <div className="text-[11px] text-emerald-600">Từ: {currentWord.word}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
                    <div>
                      <div className="text-xs font-black text-rose-800">Chưa đúng rồi!</div>
                      <div className="text-[11px] text-rose-600">Đáp án đúng: <b>{currentWord.word}</b> ({currentWord.meaning})</div>
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={handleNextStep}
                className={`px-6 py-2.5 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 text-white ${
                  isCorrect ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                <span>{isLastStep ? 'Kết thúc bài' : 'Tiếp tục (Enter)'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="text-xs text-slate-400 italic">
              {node.type === 'collocations'
                ? 'Nhấn Space để thu âm hoặc Enter sau khi hoàn thành'
                : 'Chọn câu trả lời để tiếp tục'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
