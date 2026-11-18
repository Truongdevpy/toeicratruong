// -*- coding: utf-8 -*-

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSettings } from '../context/SettingsContext';

import {

  ArrowLeft,

  Volume2,

  RefreshCw,

  Trophy,

  Zap,

  CheckCircle2,

  XCircle,

  HelpCircle,

  Play,

  RotateCcw,

  Sparkles,

  ChevronRight,

  Send,

  Sliders,

  Check,

  Undo2

} from 'lucide-react';

import {

  GameId,

  GameDefinition,

  QuestionCountChoice,

  UserGamePreference

} from '../components/games/gameTypes';

import {

  GAME_DEFINITIONS,

  GAME_CATEGORY_GROUPS,

  GRAMMAR_LEVELS

} from '../components/games/gameConfig';

import { gameStorageService } from '../components/games/gameStorageService';

import { GameCard } from '../components/games/GameCard';

import { FeaturedGame } from '../components/games/FeaturedGame';

import { GameSetupModal } from '../components/games/GameSetupModal';

import rawGameData from '../data/arenaGamesData.json';

import { sfx } from '../lib/sfx';



interface ArenaGamePageProps {

  onNavigate?: (path: string) => void;

  onFocusModeChange?: (active: boolean) => void;

}



export const ArenaGamePage: React.FC<ArenaGamePageProps> = ({
  onNavigate,
  onFocusModeChange
}) => {
  const { settings } = useSettings();
  const isDark = settings?.theme === 'dark';

  // Navigation / Active View

  const [activeGame, setActiveGame] = useState<GameDefinition | null>(null);

  const [selectedGameForModal, setSelectedGameForModal] = useState<GameDefinition | null>(null);



  // Game Options & Preferences

  const [gameCount, setGameCount] = useState<QuestionCountChoice>(10);

  const [gameOptionId, setGameOptionId] = useState<string>('all');

  const [showHints, setShowHints] = useState<boolean>(true);



  // Gameplay common state

  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const [score, setScore] = useState<number>(0);

  const [streak, setStreak] = useState<number>(0);

  const [isGameOver, setIsGameOver] = useState<boolean>(false);

  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');



  // Stats

  const [statsMap, setStatsMap] = useState<Record<string, { highScore: number; playCount: number }>>({});

  const lastPlayedGameId = useMemo(() => gameStorageService.getLastPlayedGameId(), []);



  // Reload stats helper

  const refreshStats = () => {

    const nextMap: Record<string, { highScore: number; playCount: number }> = {};

    for (const g of GAME_DEFINITIONS) {

      nextMap[g.id] = gameStorageService.getStats(g.id);

    }

    setStatsMap(nextMap);

  };



  useEffect(() => {

    refreshStats();

  }, []);



  // Read Deeplink URL params on initial mount

  useEffect(() => {

    try {

      const params = new URLSearchParams(window.location.search);

      const gameParam = params.get('game') as GameId | null;

      const countParam = params.get('count');

      const optParam = params.get('opt');

      const hintParam = params.get('hint');



      if (gameParam) {

        const found = GAME_DEFINITIONS.find((g) => g.id === gameParam);

        if (found) {

          const pref = gameStorageService.getPreferences(found.id);

          const parsedCount: QuestionCountChoice =

            countParam === 'infinite' ? 'infinite' : countParam ? (Number(countParam) as QuestionCountChoice) : pref.questionCount;

          const parsedOpt = optParam || pref.selectedOptionId;

          const parsedHints = hintParam !== null ? hintParam === '1' || hintParam === 'true' : pref.showHints !== undefined ? pref.showHints : true;



          setGameCount(parsedCount);

          setGameOptionId(parsedOpt);

          setShowHints(parsedHints);

          setActiveGame(found);

          if (onFocusModeChange) onFocusModeChange(true);

        }

      }

    } catch {}

  }, []);



  // Notify focus mode & sync URL

  const updateUrlParam = (gameId: string | null) => {

    try {

      const url = new URL(window.location.href);

      if (gameId) {

        url.searchParams.set('game', gameId);

        if (gameCount) url.searchParams.set('count', String(gameCount));

        if (gameOptionId) url.searchParams.set('opt', gameOptionId);

        url.searchParams.set('hint', showHints ? '1' : '0');

      } else {

        url.searchParams.delete('game');

        url.searchParams.delete('count');

        url.searchParams.delete('opt');

        url.searchParams.delete('hint');

      }

      window.history.replaceState({}, '', url.toString());

    } catch {}

  };



  const handleOpenModal = (game: GameDefinition) => {

    setSelectedGameForModal(game);

  };



  const handleStartGame = (gameId: GameId, count: QuestionCountChoice, optionId: string, hintsEnabled: boolean) => {

    const game = GAME_DEFINITIONS.find((g) => g.id === gameId);

    if (!game) return;



    gameStorageService.savePreferences(gameId, {

      questionCount: count,

      selectedOptionId: optionId,

      showHints: hintsEnabled

    });



    setGameCount(count);

    setGameOptionId(optionId);

    setShowHints(hintsEnabled);

    setSelectedGameForModal(null);

    setActiveGame(game);

    setCurrentIndex(0);

    setScore(0);

    setStreak(0);

    setIsGameOver(false);

    setFeedback('idle');



    if (onFocusModeChange) onFocusModeChange(true);



    try {

      const url = new URL(window.location.href);

      url.searchParams.set('game', gameId);

      url.searchParams.set('count', String(count));

      url.searchParams.set('opt', optionId);

      url.searchParams.set('hint', hintsEnabled ? '1' : '0');

      window.history.replaceState({}, '', url.toString());

    } catch {}

  };



  const handleExitGame = () => {

    if (activeGame && score > 0) {

      gameStorageService.recordGameResult(activeGame.id, score);

      refreshStats();

    }

    setActiveGame(null);

    setIsGameOver(false);

    if (onFocusModeChange) onFocusModeChange(false);

    updateUrlParam(null);

  };



  // Featured game: last played or Word Blast by default

  const featured = useMemo(() => {

    if (lastPlayedGameId) {

      const found = GAME_DEFINITIONS.find((g) => g.id === lastPlayedGameId);

      if (found) return found;

    }

    return GAME_DEFINITIONS[0];

  }, [lastPlayedGameId]);



  return (

    <div className={`min-h-screen flex flex-col transition-colors ${isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-800"}`}>

      {/* If playing a game, render edge-to-edge game arena */}

      {activeGame ? (

        <GameArenaPlayArea

          game={activeGame}

          questionCount={gameCount}

          optionId={gameOptionId}

          showHints={showHints}

          onExit={handleExitGame}

          onRecordScore={(pts) => {

            gameStorageService.recordGameResult(activeGame.id, pts);

            refreshStats();

          }}

        />

      ) : (

        /* Game Hub Screen */

        <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">

          {/* Header */}

          {onNavigate && (
            <div className="flex items-center justify-between border-b pb-4 border-slate-200/80 dark:border-slate-800/80">
              <button
                onClick={() => onNavigate('/practice')}
                className={`inline-flex items-center gap-2 text-sm font-semibold transition-colors cursor-pointer ${isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"}`}
              >
                <ArrowLeft className="w-4 h-4" /> Quay lại Practice Hub
              </button>
            </div>
          )}







          {/* Categorized Game Grid */}

          <div className="space-y-12">

            {GAME_CATEGORY_GROUPS.map((group) => {

              const gamesInGroup = GAME_DEFINITIONS.filter((g) => g.category === group.key);

              return (

                <div key={group.key} className="space-y-5">

                  <div className={`flex items-end justify-between border-b pb-3 ${isDark ? "border-slate-800/60" : "border-slate-200"}`}>
                    <div>

                      <h2 className={`text-2xl font-bold flex items-center gap-3 ${isDark ? "text-white" : "text-slate-900"}`}>
                        <span

                          className="w-2.5 h-6 rounded-full"

                          style={{ backgroundColor: group.accentColor }}

                        />

                        {group.title}

                      </h2>

                      <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>{group.description}</p>

                    </div>

                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isDark ? "text-slate-400 bg-slate-900 border border-slate-800" : "text-slate-600 bg-slate-100 border border-slate-200"}`}>
                      {group.badge}

                    </span>

                  </div>



                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    {gamesInGroup.map((game) => (

                      <GameCard

                        key={game.id}

                        game={game}

                        highScore={statsMap[game.id]?.highScore || 0}

                        playCount={statsMap[game.id]?.playCount || 0}

                        onSelect={handleOpenModal}

                      />

                    ))}

                  </div>

                </div>

              );

            })}

          </div>

        </div>

      )}



      {/* Setup Modal */}

      {selectedGameForModal && (

        <GameSetupModal

          game={selectedGameForModal}

          initialPreference={gameStorageService.getPreferences(selectedGameForModal.id)}

          isOpen={Boolean(selectedGameForModal)}

          onClose={() => setSelectedGameForModal(null)}

          onStart={(count, optionId, hints) =>

            handleStartGame(selectedGameForModal.id, count, optionId, hints)

          }

        />

      )}

    </div>

  );

};



/* -------------------------------------------------------------

 *  FULL EDGE-TO-EDGE GAME PLAY AREA (WORKSPACE)

 * ------------------------------------------------------------- */



interface GameArenaPlayAreaProps {

  game: GameDefinition;

  questionCount: QuestionCountChoice;

  optionId: string;

  showHints: boolean;

  onExit: () => void;

  onRecordScore: (score: number) => void;

}



const GameArenaPlayArea: React.FC<GameArenaPlayAreaProps> = ({

  game,

  questionCount,

  optionId,

  showHints,

  onExit,

  onRecordScore

}) => {

  const [score, setScore] = useState<number>(0);

  const [streak, setStreak] = useState<number>(0);

  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const [isFinished, setIsFinished] = useState<boolean>(false);



  // Sound effects

  const playSfx = (type: 'correct' | 'incorrect' | 'click' | 'levelup') => {

    try {

      sfx.play(type);

    } catch {}

  };



  const totalQuestions = questionCount === 'infinite' ? 999 : questionCount;



  const handleCorrect = (points = 10) => {

    playSfx('correct');

    const newStreak = streak + 1;

    const bonus = Math.floor(newStreak / 3) * 5;

    const added = points + bonus;

    const nextScore = score + added;

    setScore(nextScore);

    setStreak(newStreak);



    if (questionCount !== 'infinite' && currentIndex + 1 >= totalQuestions) {

      playSfx('levelup');

      setIsFinished(true);

      onRecordScore(nextScore);

    } else {

      setCurrentIndex((prev) => prev + 1);

    }

  };



  const handleWrong = () => {

    playSfx('incorrect');

    setStreak(0);

    if (questionCount !== 'infinite' && currentIndex + 1 >= totalQuestions) {

      setIsFinished(true);

      onRecordScore(score);

    } else {

      setCurrentIndex((prev) => prev + 1);

    }

  };



  return (

    <div className="flex-1 w-full bg-slate-950 flex flex-col justify-between p-3 sm:p-6 lg:p-8">

      {/* Top Bar Navigation */}

      <div className="w-full max-w-6xl mx-auto flex items-center justify-between gap-4 py-2 border-b border-slate-800/80 mb-6">

        <button

          onClick={onExit}

          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-sm font-semibold cursor-pointer"

        >

          <ArrowLeft className="w-4 h-4" /> Tho?t

        </button>



        <div className="flex items-center gap-3">

          <span

            className="w-3 h-3 rounded-full"

            style={{ backgroundColor: game.color }}

          />

          <h2 className="text-base sm:text-lg font-bold text-white">{game.title}</h2>

          <span className="hidden sm:inline-block text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">

            {questionCount === 'infinite' ? 'Chế độ Vô hạn' : `Câu ${currentIndex + 1} / ${totalQuestions}`}

          </span>

        </div>



        <div className="flex items-center gap-3 sm:gap-4">

          {streak >= 2 && (

            <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30 animate-pulse">

              <Zap className="w-3.5 h-3.5 fill-amber-400" /> {streak} combo!

            </div>

          )}

          <div className="flex items-center gap-1.5 text-sm sm:text-base font-extrabold text-blue-400 bg-blue-500/10 px-3.5 py-1 rounded-xl border border-blue-500/30">

            <Trophy className="w-4 h-4" /> {score} ?

          </div>

        </div>

      </div>



      {/* Main Game Container - Wide edge-to-edge max-w-5xl/6xl */}

      <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center my-auto">

        {isFinished ? (

          <div className="text-center bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl space-y-6">

            <div className="w-20 h-20 mx-auto rounded-3xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">

              <Trophy className="w-10 h-10" />

            </div>

            <div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-white">Ho?n th?nh th? th?ch!</h3>

              <p className="text-sm text-slate-400 mt-1">B?n ?? ho?n th?nh phi?n luy?n t?p xu?t s?c.</p>

            </div>

            <div className="inline-flex items-center gap-6 bg-slate-800/60 border border-slate-700 px-8 py-4 rounded-2xl">

              <div>

                <div className="text-xs text-slate-400 uppercase font-semibold">T?ng ?i?m</div>

                <div className="text-3xl font-black text-amber-400">{score} ?</div>

              </div>

              <div className="w-px h-10 bg-slate-700" />

              <div>

                <div className="text-xs text-slate-400 uppercase font-semibold">S? c?u ho?n th?nh</div>

                <div className="text-3xl font-black text-blue-400">{currentIndex + 1}</div>

              </div>

            </div>

            <div className="flex items-center justify-center gap-4 pt-4">

              <button

                onClick={() => {

                  setScore(0);

                  setStreak(0);

                  setCurrentIndex(0);

                  setIsFinished(false);

                }}

                className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-semibold flex items-center gap-2 cursor-pointer transition-colors"

              >

                <RotateCcw className="w-4 h-4" /> Ch?i l?i

              </button>

              <button

                onClick={onExit}

                className="px-8 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-2 cursor-pointer shadow-xl shadow-blue-500/25 transition-transform hover:scale-105"

              >

                Ti?p t?c tr? kh?c

              </button>

            </div>

          </div>

        ) : (

          <GameSpecificEngine

            gameId={game.id}

            currentIndex={currentIndex}

            optionId={optionId}

            showHints={showHints}

            onCorrect={handleCorrect}

            onWrong={handleWrong}

            onForceEnd={() => {

              setIsFinished(true);

              onRecordScore(score);

            }}

          />

        )}

      </div>



      {/* Footer info */}

      <div className="w-full max-w-5xl mx-auto pt-4 text-center text-xs text-slate-500 border-t border-slate-900 mt-4">

        ??u tr??ng TOEIC Gamification ? T?ch h?p ng?n h?ng d? li?u ?? thi chu?n ETS

      </div>

    </div>

  );

};



/* -------------------------------------------------------------

 *  GAME SPECIFIC ENGINE DISPATCHER & INDIVIDUAL GAMES

 * ------------------------------------------------------------- */



interface GameEngineProps {

  gameId: GameId;

  currentIndex: number;

  optionId: string;

  showHints: boolean;

  onCorrect: (points?: number) => void;

  onWrong: () => void;

  onForceEnd: () => void;

}



const GameSpecificEngine: React.FC<GameEngineProps> = (props) => {

  switch (props.gameId) {

    case 'sentence_build':

      return <SentenceBuildEngine {...props} />;

    case 'word_rain':

      return <WordRainEngine {...props} />;

    case 'match_words':

      return <MatchWordsEngine {...props} />;

    case 'grammar':

      return <GrammarGameEngine {...props} />;

    case 'dictation':

      return <DictationGameEngine {...props} />;

    case 'word_blast':

      return <WordBlastEngine {...props} />;

    case 'quiz':

      return <VocabQuizEngine {...props} />;

    case 'collocation':

      return <CollocationEngine {...props} />;

    case 'photo_match':

      return <PhotoMatchEngine {...props} />;

    default:

      return <VocabQuizEngine {...props} />;

  }

};



/* -------------------------------------------------------------

 *  1. SENTENCE BUILD GAME (GH?P C?U)

 * ------------------------------------------------------------- */

const SentenceBuildEngine: React.FC<GameEngineProps> = ({

  currentIndex,

  showHints,

  onCorrect,

  onWrong

}) => {

  // Pool of grammar/listening sentences

  const sentencePool = useMemo(() => {

    const list: { text: string; vi: string }[] = [];

    if (rawGameData.listening) {

      for (const item of rawGameData.listening) {

        if (item.sentence && item.sentence.length > 10) {

          list.push({ text: item.sentence.replace(/[.,?!]/g, '').trim(), vi: item.translation_vi || 'S?p x?p c?u chu?n TOEIC' });

        }

      }

    }

    return list.length > 0 ? list : [

      { text: 'The manager scheduled a meeting yesterday', vi: 'Qu?n l? ?? x?p l?ch m?t cu?c h?p h?m qua.' },

      { text: 'Please review the financial report carefully', vi: 'Vui l?ng xem l?i b?o c?o t?i ch?nh c?n th?n.' },

      { text: 'All visitors must register at the reception desk', vi: 'T?t c? kh?ch vi?ng th?m ph?i ??ng k? t?i b?n l? t?n.' }

    ];

  }, []);



  const currentItem = sentencePool[currentIndex % sentencePool.length];

  const targetWords = useMemo(() => currentItem.text.split(/\s+/), [currentItem]);



  // Scrambled pool

  const [availableWords, setAvailableWords] = useState<{ id: string; word: string }[]>([]);

  const [selectedWords, setSelectedWords] = useState<{ id: string; word: string }[]>([]);

  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');

  const [attempts, setAttempts] = useState<number>(0);



  // Initialize words for current question

  useEffect(() => {

    const tokens = targetWords.map((w, idx) => ({ id: `${w}-${idx}`, word: w }));

    // Shuffle

    const shuffled = [...tokens].sort(() => Math.random() - 0.5);

    setAvailableWords(shuffled);

    setSelectedWords([]);

    setStatus('idle');

    setAttempts(0);

  }, [currentIndex, targetWords]);



  const handlePickWord = (item: { id: string; word: string }) => {

    if (status !== 'idle') return;

    setAvailableWords((prev) => prev.filter((w) => w.id !== item.id));

    const nextSelected = [...selectedWords, item];

    setSelectedWords(nextSelected);



    // Auto-check if all words are picked

    if (nextSelected.length === targetWords.length) {

      checkAnswer(nextSelected);

    }

  };



  const handleRemoveWord = (item: { id: string; word: string }) => {

    if (status !== 'idle') return;

    setSelectedWords((prev) => prev.filter((w) => w.id !== item.id));

    setAvailableWords((prev) => [...prev, item]);

  };



  const checkAnswer = (selected: { id: string; word: string }[]) => {

    const userSentence = selected.map((s) => s.word.toLowerCase()).join(' ');

    const targetSentence = targetWords.map((w) => w.toLowerCase()).join(' ');



    if (userSentence === targetSentence) {

      setStatus('correct');

      setTimeout(() => {

        onCorrect(15);

      }, 1000);

    } else {

      setStatus('wrong');

      const nextAttempts = attempts + 1;

      setAttempts(nextAttempts);



      if (nextAttempts >= 2) {

        // Show correct sentence and move on after brief delay

        setTimeout(() => {

          onWrong();

        }, 1500);

      } else {

        // Reset after shake

        setTimeout(() => {

          setStatus('idle');

        }, 800);

      }

    }

  };



  return (

    <div className="w-full max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 animate-in fade-in duration-300">

      {/* Title & Prompt */}

      <div className="text-center space-y-2">

        <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">

          Gh?p t? th?nh c?u ho?n ch?nh

        </span>

        <h3 className="text-lg sm:text-2xl font-bold text-white">

          {showHints && currentItem.vi ? currentItem.vi : 'Ch?m c?c t? theo ??ng tr?t t? ng? ph?p'}

        </h3>

        {showHints && (

          <p className="text-xs text-slate-400 flex items-center justify-center gap-1">

            <HelpCircle className="w-3.5 h-3.5 text-amber-400" /> G?i ?: C?u g?m {targetWords.length} t?

          </p>

        )}

      </div>



      {/* Answer Drop Area */}

      <div

        className={`min-h-[90px] sm:min-h-[110px] p-4 sm:p-6 rounded-2xl border-2 border-dashed flex flex-wrap items-center justify-center gap-2.5 transition-all ${selectedWords.length > 0 ? "border-indigo-500 bg-indigo-500/10" : "border-slate-800 bg-slate-900/40"}`}

      >

        {selectedWords.length === 0 ? (

          <span className="text-xs sm:text-sm text-slate-500 select-none">

            Ch?m v?o c?c t? b?n d??i ?? ??a v?o c?u...

          </span>

        ) : (

          selectedWords.map((item) => (

            <button

              key={item.id}

              onClick={() => handleRemoveWord(item)}

              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-rose-600 text-white font-bold text-sm sm:text-base shadow-md transition-all transform hover:scale-95 cursor-pointer flex items-center gap-1.5"

            >

              <span>{item.word}</span>

            </button>

          ))

        )}

      </div>



      {/* Feedback banner */}

      {status === 'correct' && (

        <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-base animate-bounce">

          <CheckCircle2 className="w-5 h-5" /> Ch?nh x?c! Tuy?t v?i!

        </div>

      )}

      {status === 'wrong' && (

        <div className="flex flex-col items-center justify-center gap-1 text-rose-400 font-semibold text-sm">

          <div className="flex items-center gap-1.5">

            <XCircle className="w-4 h-4" /> Ch?a ch?nh x?c! {attempts < 2 ? 'Th? l?i nh?!' : '??p ?n chu?n:'}

          </div>

          {attempts >= 2 && (

            <div className="text-white font-bold text-base mt-1 bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">

              {currentItem.text}

            </div>

          )}

        </div>

      )}



      {/* Word Options Available */}

      <div className="space-y-3">

        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">

          C?c t? c?n gh?p:

        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5 min-h-[60px]">

          {availableWords.map((item) => (

            <button

              key={item.id}

              onClick={() => handlePickWord(item)}

              className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-indigo-600 border border-slate-700/80 hover:border-indigo-500 text-slate-200 hover:text-white font-semibold text-sm sm:text-base shadow-md transition-all transform hover:scale-105 active:scale-95 cursor-pointer"

            >

              {item.word}

            </button>

          ))}

        </div>

      </div>



      {/* Controls: Reset / Check button */}

      <div className="flex items-center justify-center gap-4 pt-2 border-t border-slate-800">

        <button

          onClick={() => {

            const tokens = targetWords.map((w, idx) => ({ id: `${w}-${idx}`, word: w }));

            setAvailableWords(tokens.sort(() => Math.random() - 0.5));

            setSelectedWords([]);

            setStatus('idle');

          }}

          disabled={selectedWords.length === 0}

          className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"

        >

          <Undo2 className="w-4 h-4" /> ??t l?i

        </button>



        {selectedWords.length > 0 && selectedWords.length < targetWords.length && (

          <button

            onClick={() => checkAnswer(selectedWords)}

            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 flex items-center gap-2 cursor-pointer transition-transform hover:scale-105"

          >

            <Check className="w-4 h-4" /> Ki?m tra ngay

          </button>

        )}

      </div>

    </div>

  );

};



/* -------------------------------------------------------------

 *  2. WORD RAIN GAME (M?A T? HI?N ??I C? CANVAS & B?N CH?N)

 * ------------------------------------------------------------- */

const WordRainEngine: React.FC<GameEngineProps> = ({

  currentIndex,

  showHints,

  onCorrect,

  onWrong

}) => {

  const vocabList = useMemo(() => {

    return rawGameData.vocab || [];

  }, []);



  const currentWordObj = vocabList[currentIndex % vocabList.length] || {

    word: 'contract',

    meaning: 'h?p ??ng',

    ipa: '/?k?n.tr?kt/',

    pos: 'n'

  };



  const [inputVal, setInputVal] = useState<string>('');

  const [dropY, setDropY] = useState<number>(10); // percentage from top 10% to 85%

  const [isBlasted, setIsBlasted] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);



  // Auto focus input

  useEffect(() => {

    if (inputRef.current) inputRef.current.focus();

  }, [currentIndex]);



  // Rain falling animation loop

  useEffect(() => {

    setDropY(10);

    setInputVal('');

    setIsBlasted(false);



    const interval = setInterval(() => {

      setDropY((prev) => {

        if (prev >= 82) {

          clearInterval(interval);

          onWrong();

          return 85;

        }

        return prev + 1.2;

      });

    }, 70);



    return () => clearInterval(interval);

  }, [currentIndex]);



  const handleSubmit = (e?: React.FormEvent) => {

    if (e) e.preventDefault();

    if (isBlasted) return;



    if (inputVal.trim().toLowerCase() === currentWordObj.word.trim().toLowerCase()) {

      setIsBlasted(true);

      setTimeout(() => {

        onCorrect(20);

      }, 500);

    } else {

      // Shake or brief wrong notice

      if (inputRef.current) {

        inputRef.current.classList.add('animate-shake');

        setTimeout(() => {

          inputRef.current?.classList.remove('animate-shake');

        }, 500);

      }

    }

  };



  return (

    <div className="w-full max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center space-y-6">

      {/* Top Banner */}

      <div className="w-full flex items-center justify-between text-xs sm:text-sm text-slate-400 border-b border-slate-800 pb-3">

        <span className="font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">

          ??? M?a t? TOEIC ? B?n h? tr??c khi ch?m ??t!

        </span>

        {showHints && (

          <span className="text-slate-400">

            G?i ?: <span className="text-amber-400 font-bold uppercase">{currentWordObj.pos}</span> ? {currentWordObj.word.length} ch? c?i ({currentWordObj.word[0]}...)

          </span>

        )}

      </div>



      {/* Sky Canvas Drop Area */}

      <div className="relative w-full h-[320px] sm:h-[360px] bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/40 rounded-2xl border border-slate-800 overflow-hidden shadow-inner flex flex-col justify-between">

        {/* Sky Stars */}

        <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />



        {/* Falling Target Cloud/Drop */}

        <div

          className="absolute left-1/2 -translate-x-1/2 transition-all duration-75 flex flex-col items-center"

          style={{ top: `${dropY}%` }}

        >

          <div className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-extrabold text-base sm:text-xl shadow-xl shadow-cyan-500/30 border border-cyan-300/40 flex items-center gap-2 animate-pulse">

            <span>??</span>

            <span>{currentWordObj.meaning}</span>

          </div>

          {currentWordObj.ipa && (

            <span className="text-xs text-cyan-300/80 font-mono mt-1">{currentWordObj.ipa}</span>

          )}

        </div>



        {/* Laser Defense Line (Warning threshold) */}

        <div className="absolute bottom-10 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_12px_rgba(244,63,94,0.8)]" />

        <div className="absolute bottom-3 left-4 text-[10px] font-bold uppercase tracking-widest text-rose-400/80">

          V?ch c?nh b?o va ch?m

        </div>

      </div>



      {/* Shooter Input Box */}

      <form onSubmit={handleSubmit} className="w-full max-w-xl flex items-center gap-3">

        <div className="relative flex-1">

          <input

            ref={inputRef}

            type="text"

            value={inputVal}

            onChange={(e) => setInputVal(e.target.value)}

            placeholder="Gõ từ tiếng Anh tương ứng..."

            className="w-full px-5 py-4 rounded-2xl bg-slate-950 border-2 border-slate-700 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/20 text-white font-bold text-lg outline-none transition-all placeholder:text-slate-600"

          />

          {showHints && (

            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded-md">

              B?t ??u: {currentWordObj.word.slice(0, 2)}

            </span>

          )}

        </div>



        <button

          type="submit"

          className="px-6 sm:px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-base shadow-xl shadow-cyan-500/30 flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0"

        >

          <Zap className="w-5 h-5 fill-current" /> B?n!

        </button>

      </form>

    </div>

  );

};



/* -------------------------------------------------------------

 *  3. MATCH WORDS GAME (QUIZLET MATCH STYLE)

 * ------------------------------------------------------------- */

interface MatchCard {

  id: string;

  keyId: string; // pairs share the same keyId

  text: string;

  type: 'en' | 'vi';

}



const MatchWordsEngine: React.FC<GameEngineProps> = ({

  currentIndex,

  showHints,

  onCorrect

}) => {

  const vocabList = useMemo(() => rawGameData.vocab || [], []);



  // 4 words for each set

  const [cards, setCards] = useState<MatchCard[]>([]);

  const [selectedCard, setSelectedCard] = useState<MatchCard | null>(null);

  const [matchedKeyIds, setMatchedKeyIds] = useState<string[]>([]);

  const [wrongPair, setWrongPair] = useState<string[]>([]);



  // Setup round

  useEffect(() => {

    const startIdx = (currentIndex * 4) % (vocabList.length - 4);

    const roundWords = vocabList.slice(startIdx, startIdx + 4);



    const generatedCards: MatchCard[] = [];

    roundWords.forEach((w) => {

      generatedCards.push({

        id: `en-${w.id}`,

        keyId: w.id,

        text: w.word,

        type: 'en'

      });

      generatedCards.push({

        id: `vi-${w.id}`,

        keyId: w.id,

        text: w.meaning,

        type: 'vi'

      });

    });



    // Shuffle cards

    setCards([...generatedCards].sort(() => Math.random() - 0.5));

    setSelectedCard(null);

    setMatchedKeyIds([]);

    setWrongPair([]);

  }, [currentIndex, vocabList]);



  const handleCardClick = (card: MatchCard) => {

    if (matchedKeyIds.includes(card.keyId)) return;

    if (wrongPair.length > 0) return; // in animation



    // If first pick

    if (!selectedCard) {

      setSelectedCard(card);

      return;

    }



    // If click same card, deselect

    if (selectedCard.id === card.id) {

      setSelectedCard(null);

      return;

    }



    // If click card of same language type, switch selection

    if (selectedCard.type === card.type) {

      setSelectedCard(card);

      return;

    }



    // Check Match

    if (selectedCard.keyId === card.keyId) {

      // Correct match!

      const nextMatched = [...matchedKeyIds, card.keyId];

      setMatchedKeyIds(nextMatched);

      setSelectedCard(null);



      // If all 4 pairs matched, advance round

      if (nextMatched.length === 4) {

        setTimeout(() => {

          onCorrect(25);

        }, 600);

      }

    } else {

      // Wrong match: flash red & shake

      setWrongPair([selectedCard.id, card.id]);

      setTimeout(() => {

        setWrongPair([]);

        setSelectedCard(null);

      }, 700);

    }

  };



  return (

    <div className="w-full max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 animate-in fade-in duration-300">

      {/* Header */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">

        <div>

          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">

            N?i c?p T? - Ngh?a chu?n Quizlet

          </span>

          <h3 className="text-xl font-bold text-white mt-1">Ch?m 1 th? ti?ng Anh v? 1 th? ti?ng Vi?t t??ng ?ng</h3>

        </div>

        <div className="text-right">

          <span className="text-xs text-slate-400">Ti?n ?? m?n</span>

          <div className="text-lg font-black text-cyan-400">{matchedKeyIds.length} / 4 c?p</div>

        </div>

      </div>



      {/* Grid Cards (4 x 2 = 8 cards) */}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">

        {cards.map((card) => {

          const isMatched = matchedKeyIds.includes(card.keyId);

          const isSelected = selectedCard?.id === card.id;

          const isWrong = wrongPair.includes(card.id);



          return (

            <button

              key={card.id}

              onClick={() => handleCardClick(card)}

              disabled={isMatched}

              className={`h-28 sm:h-32 p-3 sm:p-4 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all transform cursor-pointer relative overflow-hidden select-none ${isMatched ? "border-emerald-500 bg-emerald-500/10 opacity-40 cursor-not-allowed" : isSelected ? "border-cyan-400 bg-cyan-500/20 shadow-lg shadow-cyan-500/20 scale-105" : "border-slate-800 bg-slate-900/60 hover:border-slate-700"}`}

            >

              <span className="text-xs uppercase font-bold tracking-wider mb-1 text-slate-400">

                {card.type === 'en' ? 'EN' : 'VI'}

              </span>

              <span className="text-sm sm:text-base font-bold line-clamp-2 leading-snug">

                {card.text}

              </span>

              {isMatched && (

                <div className="absolute bottom-2 right-2 text-emerald-400">

                  <Check className="w-4 h-4" />

                </div>

              )}

            </button>

          );

        })}

      </div>



      {/* Helper Footer */}

      <div className="text-center text-xs text-slate-500">

        Gh?p chu?n x?c c? 4 c?p ?? ho?n th?nh v?ng v? nh?n ?i?m th??ng li?n ho?n!

      </div>

    </div>

  );

};



/* -------------------------------------------------------------

 *  4. GRAMMAR GAME ENGINE (PART 5 PH?N THEO 3 C?P ??)

 * ------------------------------------------------------------- */

const GrammarGameEngine: React.FC<GameEngineProps> = ({

  currentIndex,

  optionId,

  showHints,

  onCorrect,

  onWrong

}) => {

  const grammarList = useMemo(() => {

    const all = rawGameData.grammar || [];

    if (!optionId || optionId === 'all') return all;

    const filtered = all.filter((item: any) => item.level === optionId);

    return filtered.length > 0 ? filtered : all;

  }, [optionId]);



  const currentQ = grammarList[currentIndex % grammarList.length] || {

    question: 'Please review the attached contract ------- signing it.',

    options: ['before', 'whereas', 'instead', 'afterward'],

    answer: 'A',

    explanation: 'Ch?n li?n t? ch? th?i gian tr??c khi l?m g? ??: before + V-ing.'

  };



  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);

  const [showExplanation, setShowExplanation] = useState<boolean>(false);



  useEffect(() => {

    setSelectedOpt(null);

    setShowExplanation(false);

  }, [currentIndex]);



  const handleSelect = (choice: string) => {

    if (selectedOpt) return; // already answered

    setSelectedOpt(choice);

    setShowExplanation(true);



    const isRight = choice === currentQ.answer;

    setTimeout(() => {

      if (isRight) {

        onCorrect(15);

      } else {

        onWrong();

      }

    }, 1200);

  };



  const optionLetters = ['A', 'B', 'C', 'D'];



  return (

    <div className="w-full max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 animate-in fade-in duration-300">

      {/* Question Header */}

      <div className="space-y-3 border-b border-slate-800 pb-5">

        <div className="flex items-center justify-between">

          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">

            Part 5: Ho?n th?nh c?u ng? ph?p

          </span>

          <span className="text-xs text-slate-400">

            {optionId === 'level1' && '?? C?p ?? C? b?n (< 450)'}

            {optionId === 'level2' && '?? C?p ?? Trung c?p (450-650)'}

            {optionId === 'level3' && '?? C?p ?? N?ng cao (650+)'}

            {(!optionId || optionId === 'all') && '? T?ng h?p c?p ??'}

          </span>

        </div>

        <h3 className="text-lg sm:text-2xl font-bold text-white leading-relaxed">

          {currentQ.question}

        </h3>

      </div>



      {/* 4 Choices */}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {currentQ.options.map((optText: string, idx: number) => {

          const letter = optionLetters[idx];

          const isSelected = selectedOpt === letter;

          const isRight = letter === currentQ.answer;



          let btnClass = 'bg-slate-800/80 border-slate-700/80 hover:bg-slate-800 hover:border-slate-500 text-slate-200';

          if (selectedOpt) {

            if (isRight) {

              btnClass = 'bg-emerald-950/60 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500';

            } else if (isSelected) {

              btnClass = 'bg-rose-950/60 border-rose-500 text-rose-300 ring-2 ring-rose-500';

            } else {

              btnClass = 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-50';

            }

          }



          return (

            <button

              key={letter}

              onClick={() => handleSelect(letter)}

              disabled={Boolean(selectedOpt)}

              className={`p-4 sm:p-5 rounded-2xl border-2 text-left flex items-center gap-3.5 transition-all transform cursor-pointer ${btnClass}`}

            >

              <span className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm bg-slate-800">

                {letter}

              </span>

              <span className="text-base sm:text-lg font-medium">{optText}</span>

            </button>

          );

        })}

      </div>



      {/* Explanation Box */}

      {showExplanation && (

        <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 text-xs sm:text-sm text-slate-300 space-y-1 animate-in fade-in">

          <div className="font-bold text-indigo-400 flex items-center gap-1.5">

            <Sparkles className="w-4 h-4" /> Gi?i th?ch chi ti?t:

          </div>

          <p className="leading-relaxed whitespace-pre-line">{currentQ.explanation}</p>

        </div>

      )}

    </div>

  );

};



/* -------------------------------------------------------------

 *  5. DICTATION GAME ENGINE (C?U NG?N L? + ?I?U CH?NH T?C ??)

 * ------------------------------------------------------------- */

const DictationGameEngine: React.FC<GameEngineProps> = ({

  currentIndex,

  showHints,

  onCorrect,

  onWrong

}) => {

  const listeningPool = useMemo(() => {

    return rawGameData.listening || [];

  }, []);



  const currentItem = listeningPool[currentIndex % listeningPool.length] || {

    sentence: 'Please take a seat over there.',

    audio_url: '',

    translation_vi: 'Vui l?ng ng?i ? ??ng kia.'

  };



  const [inputVal, setInputVal] = useState<string>('');

  const [playbackRate, setPlaybackRate] = useState<number>(1.0);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');

  const audioRef = useRef<HTMLAudioElement | null>(null);



  // Stop previous audio and load next

  useEffect(() => {

    setInputVal('');

    setStatus('idle');

    if (audioRef.current) {

      audioRef.current.playbackRate = playbackRate;

      audioRef.current.currentTime = 0;

      audioRef.current.play().catch(() => {});

    }

  }, [currentIndex]);



  const handlePlayAudio = (rate = playbackRate) => {

    if (audioRef.current) {

      audioRef.current.playbackRate = rate;

      audioRef.current.currentTime = 0;

      setIsPlaying(true);

      audioRef.current.play().catch(() => {});

    }

  };



  const cleanText = (str: string) => str.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();



  const handleCheck = (e?: React.FormEvent) => {

    if (e) e.preventDefault();

    if (status !== 'idle') return;



    const userClean = cleanText(inputVal);

    const targetClean = cleanText(currentItem.sentence);



    if (userClean === targetClean) {

      setStatus('correct');

      setTimeout(() => {

        onCorrect(20);

      }, 1000);

    } else {

      setStatus('wrong');

      setTimeout(() => {

        onWrong();

      }, 1400);

    }

  };



  return (

    <div className="w-full max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 animate-in fade-in duration-300">

      {/* Hidden audio element */}

      {currentItem.audio_url && (

        <audio

          ref={audioRef}

          src={currentItem.audio_url}

          onEnded={() => setIsPlaying(false)}

        />

      )}



      {/* Header */}

      <div className="text-center space-y-2">

        <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">

          Nghe ch?p c?u ng?n Part 1 & Part 2

        </span>

        <h3 className="text-xl sm:text-2xl font-bold text-white">

          Nghe audio v? g? ch?nh x?c c?u tho?i b?n nghe ???c

        </h3>

        {showHints && (

          <p className="text-xs text-slate-400">

            D?ch ngh?a: <span className="text-slate-300 font-medium">{currentItem.translation_vi}</span>

          </p>

        )}

      </div>



      {/* Audio Play Center & Speed Controls */}

      <div className="flex flex-col items-center justify-center gap-4 p-6 rounded-2xl bg-slate-950/60 border border-slate-800">

        <button

          onClick={() => handlePlayAudio(playbackRate)}

          className="w-20 h-20 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white flex items-center justify-center shadow-xl shadow-amber-500/30 transform hover:scale-105 active:scale-95 transition-all cursor-pointer"

        >

          <Volume2 className="w-10 h-10" />

        </button>



        <div className="flex items-center gap-2">

          {[

            { rate: 0.8, label: '0.8x Ch?m' },

            { rate: 1.0, label: '1.0x Chu?n ETS' },

            { rate: 1.2, label: '1.2x Nhanh' }

          ].map((item) => (

            <button

              key={item.rate}

              onClick={() => {

                setPlaybackRate(item.rate);

                handlePlayAudio(item.rate);

              }}

              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${playbackRate === item.rate ? "border-cyan-400 bg-cyan-500/20 text-cyan-300" : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"}`}

            >

              {item.label}

            </button>

          ))}

        </div>

      </div>



      {/* Input & Form */}

      <form onSubmit={handleCheck} className="space-y-4">

        <div className="relative">

          <input

            type="text"

            value={inputVal}

            onChange={(e) => setInputVal(e.target.value)}

            placeholder="G? l?i nguy?n c?u ti?ng Anh b?n nghe ???c..."

            className={`w-full px-5 py-4 rounded-2xl bg-slate-950 border-2 font-bold text-base sm:text-lg text-white outline-none transition-all placeholder:text-slate-600 ${status === "correct" ? "border-emerald-500 bg-emerald-500/10" : status === "wrong" ? "border-rose-500 bg-rose-500/10" : "border-slate-800 focus:border-cyan-500"}`}

          />

        </div>



        {status === 'correct' && (

          <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-sm animate-bounce">

            <CheckCircle2 className="w-4 h-4" /> Xu?t s?c! Ch?p ho?n to?n ch?nh x?c!

          </div>

        )}



        {status === 'wrong' && (

          <div className="text-center space-y-1 text-xs text-rose-400 font-semibold">

            <p>Ch?a ho?n to?n chu?n x?c. C?u ??ng l?:</p>

            <p className="text-white font-bold text-sm sm:text-base bg-slate-800 p-2 rounded-xl">

              {currentItem.sentence}

            </p>

          </div>

        )}



        <div className="flex justify-center">

          <button

            type="submit"

            className="px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-amber-500/20 flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 cursor-pointer"

          >

            <Check className="w-4 h-4" /> Ki?m tra c?u

          </button>

        </div>

      </form>

    </div>

  );

};



/* -------------------------------------------------------------

 *  6. VOCAB QUIZ ENGINE (TR?C NGHI?M 4 ??P ?N)

 * ------------------------------------------------------------- */

const VocabQuizEngine: React.FC<GameEngineProps> = ({

  currentIndex,

  showHints,

  onCorrect,

  onWrong

}) => {

  const vocabList = useMemo(() => rawGameData.vocab || [], []);

  const currentWord = vocabList[currentIndex % vocabList.length] || {

    word: 'inspire',

    meaning: 'truy?n c?m h?ng',

    ipa: '/?n?spa??r/'

  };



  // Generate 4 choices

  const [choices, setChoices] = useState<string[]>([]);

  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);



  useEffect(() => {

    setSelectedChoice(null);

    const rightMeaning = currentWord.meaning;

    const otherMeanings = vocabList

      .filter((w) => w.id !== currentWord.id)

      .map((w) => w.meaning);

    const shuffledOthers = [...otherMeanings].sort(() => Math.random() - 0.5).slice(0, 3);

    const pool = [rightMeaning, ...shuffledOthers].sort(() => Math.random() - 0.5);

    setChoices(pool);

  }, [currentIndex, currentWord, vocabList]);



  const handlePick = (choice: string) => {

    if (selectedChoice) return;

    setSelectedChoice(choice);



    const isRight = choice === currentWord.meaning;

    setTimeout(() => {

      if (isRight) {

        onCorrect(10);

      } else {

        onWrong();

      }

    }, 900);

  };



  return (

    <div className="w-full max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 animate-in fade-in duration-300">

      {/* Word Box */}

      <div className="text-center space-y-2 border-b border-slate-800 pb-6">

        <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">

          Tr?c nghi?m ngh?a t? v?ng

        </span>

        <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">

          {currentWord.word}

        </h3>

        {currentWord.ipa && <p className="text-sm text-cyan-300/80 font-mono">{currentWord.ipa}</p>}

      </div>



      {/* 4 Choices */}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {choices.map((choice, idx) => {

          const isSelected = selectedChoice === choice;

          const isRight = choice === currentWord.meaning;



          let btnClass = 'bg-slate-800/80 border-slate-700/80 hover:bg-slate-800 hover:border-slate-500 text-slate-200';

          if (selectedChoice) {

            if (isRight) {

              btnClass = 'bg-emerald-950/60 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500';

            } else if (isSelected) {

              btnClass = 'bg-rose-950/60 border-rose-500 text-rose-300 ring-2 ring-rose-500';

            } else {

              btnClass = 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-50';

            }

          }



          return (

            <button

              key={choice + idx}

              onClick={() => handlePick(choice)}

              disabled={Boolean(selectedChoice)}

              className={`p-4 sm:p-5 rounded-2xl border-2 text-left flex items-center gap-3 transition-all transform cursor-pointer ${btnClass}`}

            >

              <span className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0">

                {idx + 1}

              </span>

              <span className="text-base sm:text-lg font-semibold">{choice}</span>

            </button>

          );

        })}

      </div>

    </div>

  );

};



/* -------------------------------------------------------------

 *  7. WORD BLAST ENGINE (B?N T? THEO TH?I GIAN)

 * ------------------------------------------------------------- */

const WordBlastEngine: React.FC<GameEngineProps> = (props) => {

  return <VocabQuizEngine {...props} />;

};



/* -------------------------------------------------------------

 *  8. COLLOCATION ENGINE (?I?N T? GH?P C?M)

 * ------------------------------------------------------------- */

const CollocationEngine: React.FC<GameEngineProps> = ({

  currentIndex,

  showHints,

  onCorrect,

  onWrong

}) => {

  const vocabList = useMemo(() => {

    return (rawGameData.vocab || []).filter((v: any) => v.collocations && v.collocations.length > 0);

  }, []);



  const currentItem = vocabList[currentIndex % vocabList.length] || {

    word: 'decision',

    meaning: 'quy?t ??nh',

    collocations: ['make a decision', 'reach a decision']

  };



  const currentPair = currentItem.collocations?.[0] || 'make a decision';

  const parts = currentPair.split(new RegExp(currentItem.word, 'i'));

  const promptText = parts.length > 1 ? `${parts[0]}_______` : `_______`;



  const [inputVal, setInputVal] = useState<string>('');

  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');



  useEffect(() => {

    setInputVal('');

    setStatus('idle');

  }, [currentIndex]);



  const handleSubmit = (e: React.FormEvent) => {

    e.preventDefault();

    if (status !== 'idle') return;



    if (inputVal.trim().toLowerCase() === currentItem.word.toLowerCase()) {

      setStatus('correct');

      setTimeout(() => onCorrect(15), 900);

    } else {

      setStatus('wrong');

      setTimeout(() => onWrong(), 1300);

    }

  };



  return (

    <div className="w-full max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 animate-in fade-in duration-300">

      <div className="text-center space-y-2 border-b border-slate-800 pb-5">

        <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">

          TOEIC Collocation C?m t? hay g?p

        </span>

        <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-2 font-mono">

          {promptText}

        </h3>

        <p className="text-sm text-slate-400">Ngh?a c?m: {currentItem.meaning}</p>

        {showHints && (

          <p className="text-xs text-amber-400">

            G?i ?: T? b?t ??u b?ng ch? "{currentItem.word[0]}" ({currentItem.word.length} ch? c?i)

          </p>

        )}

      </div>



      <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">

        <input

          type="text"

          value={inputVal}

          onChange={(e) => setInputVal(e.target.value)}

          placeholder={`Nhập từ còn thiếu (${currentItem.word.length} chữ cái)...`}

          className="w-full px-5 py-4 rounded-2xl bg-slate-950 border-2 border-slate-700 focus:border-cyan-500 text-white font-bold text-center text-xl outline-none"

        />

        {status === 'correct' && (

          <div className="text-emerald-400 text-center font-bold text-sm animate-bounce">

            Ch?nh x?c! C?m t?: {currentPair}

          </div>

        )}

        {status === 'wrong' && (

          <div className="text-rose-400 text-center text-xs font-bold">

            Ch?a ??ng! ??p ?n: {currentItem.word} ({currentPair})

          </div>

        )}

        <div className="flex justify-center">

          <button

            type="submit"

            className="px-8 py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-cyan-500/20 cursor-pointer"

          >

            Ki?m tra

          </button>

        </div>

      </form>

    </div>

  );

};



/* -------------------------------------------------------------

 *  9. PHOTO MATCH ENGINE (PART 1 TRANH ?NH)

 * ------------------------------------------------------------- */

const PhotoMatchEngine: React.FC<GameEngineProps> = ({

  currentIndex,

  showHints,

  onCorrect,

  onWrong

}) => {

  const imagesPool = useMemo(() => rawGameData.images || [], []);

  const currentItem = imagesPool[currentIndex % imagesPool.length] || {

    image_url: '/dautoeic_media/media_files/images/1790348277013-1.jpg',

    sentence: "She's examining a chart near some equipment.",

    correct_answer: 'A',

    options: [

      "She's examining a chart near some equipment.",

      "She's loading paper into an office copier.",

      "She's opening a filing drawer.",

      "She's stapling a few pages."

    ]

  };



  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);



  useEffect(() => {

    setSelectedOpt(null);

  }, [currentIndex]);



  const handleSelect = (idx: number) => {

    if (selectedOpt !== null) return;

    setSelectedOpt(idx);



    const isRight = currentItem.options[idx] === currentItem.sentence;

    setTimeout(() => {

      if (isRight) onCorrect(15);

      else onWrong();

    }, 1100);

  };



  const letters = ['A', 'B', 'C', 'D'];



  return (

    <div className="w-full max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 animate-in fade-in duration-300">

      <div className="text-center">

        <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">

          Part 1: Mi?u t? tranh ?nh

        </span>

        <h3 className="text-lg sm:text-xl font-bold text-white mt-1">

          Ch?n c?u mi?u t? ch?nh x?c nh?t h?nh ??ng trong ?nh

        </h3>

      </div>



      {/* Image Preview */}

      <div className="w-full max-w-md mx-auto h-56 sm:h-64 rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center shadow-lg">

        <img

          src={currentItem.image_url}

          alt="Part 1 Toeic Photo"

          className="w-full h-full object-contain"

          onError={(e) => {

            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80';

          }}

        />

      </div>



      {/* 4 Choices */}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">

        {currentItem.options.map((optText: string, idx: number) => {

          const isSelected = selectedOpt === idx;

          const isRight = optText === currentItem.sentence;



          let btnClass = 'bg-slate-800/80 border-slate-700 hover:bg-slate-800 hover:border-slate-500 text-slate-200';

          if (selectedOpt !== null) {

            if (isRight) btnClass = 'bg-emerald-950/60 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500';

            else if (isSelected) btnClass = 'bg-rose-950/60 border-rose-500 text-rose-300 ring-2 ring-rose-500';

            else btnClass = 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-50';

          }



          return (

            <button

              key={idx}

              onClick={() => handleSelect(idx)}

              disabled={selectedOpt !== null}

              className={`p-4 rounded-2xl border-2 text-left flex items-center gap-3 transition-all cursor-pointer ${btnClass}`}

            >

              <span className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0">

                {letters[idx]}

              </span>

              <span className="text-sm sm:text-base font-medium">{optText}</span>

            </button>

          );

        })}

      </div>

    </div>

  );

};

