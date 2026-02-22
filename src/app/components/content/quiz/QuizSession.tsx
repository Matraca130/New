// ============================================================
// Axon — QuizSession
// Per-question quiz-taking interface with navigation,
// answer submission, and real-time scoring.
// ============================================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import * as quizApi from '@/app/services/quizApi';
import type { QuizQuestion } from '@/app/services/quizApi';
import { QuestionTypeBadge, DifficultyBadge } from '@/app/components/shared/QuestionBadges';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/app/components/ui/button';
import {
  CheckCircle2, XCircle, ChevronLeft,
  ArrowRight, BookOpen,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────

export interface SessionResults {
  total: number;
  correct: number;
  startTime: number;
  answers: { questionId: string; answer: string; isCorrect: boolean; timeMs: number }[];
}

interface QuizSessionProps {
  questions: QuizQuestion[];
  topicName: string;
  sessionId: string | null;
  onComplete: (results: SessionResults) => void;
  onBack: () => void;
}

// ── Component ─────────────────────────────────────────────

export function QuizSession({ questions, topicName, sessionId, onComplete, onBack }: QuizSessionProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, { answer: string; isCorrect: boolean; timeMs: number }>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  const startTimeRef = useRef(Date.now());
  const questionStartRef = useRef(Date.now());

  const q = questions[currentIdx];
  const currentAnswer = answers[currentIdx];

  // Reset live state when navigating
  useEffect(() => {
    questionStartRef.current = Date.now();
    const existing = answers[currentIdx];
    if (existing) {
      setSelectedOption(existing.answer);
      setTextAnswer(existing.answer);
      setSubmitted(true);
    } else {
      setSelectedOption(null);
      setTextAnswer('');
      setSubmitted(false);
    }
  }, [currentIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitAnswer = useCallback(async () => {
    if (submitted) return;
    const timeMs = Date.now() - questionStartRef.current;

    let userAnswer = '';
    let isCorrect = false;

    if (q.question_type === 'multiple_choice' || q.question_type === 'true_false') {
      if (!selectedOption) return;
      userAnswer = selectedOption;
      isCorrect = selectedOption === q.correct_answer;
    } else {
      if (!textAnswer.trim()) return;
      userAnswer = textAnswer.trim();
      isCorrect = userAnswer.toLowerCase() === q.correct_answer.toLowerCase();
    }

    setSubmitted(true);
    setAnswers(prev => ({ ...prev, [currentIdx]: { answer: userAnswer, isCorrect, timeMs } }));

    // Submit attempt to backend (fire-and-forget)
    quizApi.createQuizAttempt({
      quiz_question_id: q.id,
      answer: userAnswer,
      is_correct: isCorrect,
      session_id: sessionId || undefined,
      time_taken_ms: timeMs,
    }).catch(err => {
      if (import.meta.env.DEV) console.warn('[Quiz] Failed to submit attempt:', err);
    });
  }, [submitted, q, selectedOption, textAnswer, sessionId, currentIdx]);

  const goNext = () => {
    if (currentIdx < questions.length - 1) {
      setDirection('forward');
      setCurrentIdx(currentIdx + 1);
    } else {
      const allAnswers = Object.entries(answers).map(([idxStr, a]) => {
        const idx = Number(idxStr);
        return {
          questionId: questions[idx].id,
          answer: a.answer,
          isCorrect: a.isCorrect,
          timeMs: a.timeMs,
        };
      });
      onComplete({
        total: questions.length,
        correct: allAnswers.filter(a => a.isCorrect).length,
        startTime: startTimeRef.current,
        answers: allAnswers,
      });
    }
  };

  const goPrev = () => {
    if (currentIdx > 0) {
      setDirection('back');
      setCurrentIdx(currentIdx - 1);
    }
  };

  const correctCount = useMemo(() => Object.values(answers).filter(a => a.isCorrect).length, [answers]);
  const wrongCount = useMemo(() => Object.values(answers).filter(a => !a.isCorrect).length, [answers]);

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* ── Top Bar ── */}
      <div className="h-12 flex items-center justify-between px-5 border-b border-zinc-800 shrink-0 bg-zinc-900">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1 p-1.5 -ml-1 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors">
            <ChevronLeft size={18} />
            <span className="text-sm">Volver</span>
          </button>
          <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center">
            <BookOpen size={14} className="text-violet-400" />
          </div>
          <span className="text-sm text-zinc-300 truncate max-w-[260px]">Quiz: {topicName}</span>
        </div>
        <div className="flex items-center gap-2">
          {correctCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <CheckCircle2 size={10} /> {correctCount}
            </span>
          )}
          {wrongCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
              <XCircle size={10} /> {wrongCount}
            </span>
          )}
        </div>
      </div>

      {/* ── Content (scrollable) ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full px-6 md:px-10 py-6 md:py-8">
          {/* Progress Bar */}
          <ProgressBar
            total={questions.length}
            currentIdx={currentIdx}
            answers={answers}
            onJump={(idx) => { setDirection(idx < currentIdx ? 'back' : 'forward'); setCurrentIdx(idx); }}
          />

          {/* Question */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIdx}
              initial={{ opacity: 0, y: direction === 'forward' ? 16 : -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: direction === 'forward' ? -16 : 16 }}
              transition={{ duration: 0.25 }}
            >
              {/* Badges */}
              <div className="mb-4 flex items-center gap-2 flex-wrap">
                <QuestionTypeBadge type={q.question_type} size="xs" />
                <DifficultyBadge difficulty={q.difficulty} size="xs" />
                {submitted && (
                  <span className="text-[10px] text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700">
                    Respondida
                  </span>
                )}
              </div>

              {/* Question text */}
              <div className="flex gap-4 mb-8">
                <span className="text-zinc-600 text-lg shrink-0">{currentIdx + 1}.</span>
                <h3 className="text-lg text-white leading-relaxed">{q.question}</h3>
              </div>

              {/* Answer area (polymorphic by question_type) */}
              {q.question_type === 'multiple_choice' && q.options && (
                <MultipleChoiceOptions
                  options={q.options}
                  correctAnswer={q.correct_answer}
                  explanation={q.explanation}
                  selectedOption={selectedOption}
                  submitted={submitted}
                  onSelect={opt => !submitted && setSelectedOption(opt)}
                />
              )}

              {q.question_type === 'true_false' && (
                <TrueFalseOptions
                  correctAnswer={q.correct_answer}
                  selectedOption={selectedOption}
                  submitted={submitted}
                  onSelect={opt => !submitted && setSelectedOption(opt)}
                />
              )}

              {q.question_type === 'open' && (
                <OpenAnswer
                  textAnswer={textAnswer}
                  correctAnswer={q.correct_answer}
                  explanation={q.explanation}
                  isCorrect={currentAnswer?.isCorrect ?? false}
                  submitted={submitted}
                  onTextChange={setTextAnswer}
                  onSubmit={submitAnswer}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Bottom Nav ── */}
      <div className="h-14 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between px-5 shrink-0">
        <Button variant="ghost" onClick={goPrev} disabled={currentIdx === 0} className="text-zinc-500 hover:text-white">
          <ChevronLeft size={16} /> Anterior
        </Button>
        <div className="flex items-center gap-3">
          {!submitted ? (
            <Button
              onClick={submitAnswer}
              disabled={
                (q.question_type !== 'open' && !selectedOption) ||
                (q.question_type === 'open' && !textAnswer.trim())
              }
              className="bg-violet-600 hover:bg-violet-700 text-white px-6"
            >
              Confirmar
            </Button>
          ) : (
            <Button
              onClick={goNext}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-6 gap-2"
            >
              {currentIdx === questions.length - 1 ? 'Ver Resultados' : 'Siguiente'}
              <ArrowRight size={14} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// ── Sub-components ───────────────────────────────────────
// ══════════════════════════════════════════════════════════

const ProgressBar = React.memo(function ProgressBar({
  total, currentIdx, answers, onJump,
}: {
  total: number;
  currentIdx: number;
  answers: Record<number, { isCorrect: boolean }>;
  onJump: (idx: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 mb-8">
      <div className="flex-1 flex items-center gap-[3px]">
        {Array.from({ length: total }, (_, idx) => {
          const a = answers[idx];
          let color = 'bg-zinc-800';
          if (a?.isCorrect) color = 'bg-emerald-500';
          else if (a && !a.isCorrect) color = 'bg-rose-400';
          else if (idx === currentIdx) color = 'bg-violet-500';
          const isCurrent = idx === currentIdx;
          return (
            <button
              key={`progress-${idx}`}
              onClick={() => onJump(idx)}
              className={`h-1.5 rounded-full flex-1 transition-all cursor-pointer hover:opacity-80 ${color} ${isCurrent ? 'ring-1 ring-violet-400 ring-offset-1 ring-offset-zinc-950' : ''}`}
              title={`Pregunta ${idx + 1}`}
            />
          );
        })}
      </div>
      <span className="text-xs text-zinc-500 shrink-0">{currentIdx + 1} de {total}</span>
    </div>
  );
});

const MultipleChoiceOptions = React.memo(function MultipleChoiceOptions({
  options, correctAnswer, explanation, selectedOption, submitted, onSelect,
}: {
  options: string[];
  correctAnswer: string;
  explanation: string | null;
  selectedOption: string | null;
  submitted: boolean;
  onSelect: (opt: string) => void;
}) {
  return (
    <div className="space-y-3 mb-6">
      {options.map((option, idx) => {
        const isSelected = selectedOption === option;
        const isCorrectOption = option === correctAnswer;
        const wasSelectedWrong = submitted && isSelected && !isCorrectOption;
        const wasCorrect = submitted && isCorrectOption;

        return (
          <button
            key={`opt-${idx}-${option}`}
            onClick={() => onSelect(option)}
            disabled={submitted}
            className={`w-full text-left rounded-xl border-2 transition-all overflow-hidden ${
              !submitted && !isSelected ? 'border-zinc-800 hover:border-zinc-700 bg-zinc-900' :
              !submitted && isSelected ? 'border-violet-500/50 bg-violet-500/10' :
              wasCorrect ? 'border-emerald-500/50 bg-emerald-500/10' :
              wasSelectedWrong ? 'border-rose-500/50 bg-rose-500/10' :
              'border-zinc-800 bg-zinc-900 opacity-50'
            }`}
          >
            <div className="px-5 py-4 flex items-start gap-3">
              <span className={`text-sm shrink-0 mt-0.5 ${
                wasCorrect ? 'text-emerald-400' : wasSelectedWrong ? 'text-rose-400' :
                isSelected ? 'text-violet-400' : 'text-zinc-600'
              }`}>
                {String.fromCharCode(65 + idx)}.
              </span>
              <span className={`text-sm ${
                wasCorrect ? 'text-white' : wasSelectedWrong ? 'text-zinc-300' :
                isSelected ? 'text-white' : 'text-zinc-400'
              }`}>
                {option}
              </span>
              {wasCorrect && <CheckCircle2 size={16} className="ml-auto text-emerald-400 shrink-0" />}
              {wasSelectedWrong && <XCircle size={16} className="ml-auto text-rose-400 shrink-0" />}
            </div>

            {submitted && (wasSelectedWrong || wasCorrect) && explanation && (
              <div className="px-5 pb-4 pt-0">
                <div className="flex items-start gap-2">
                  {wasCorrect
                    ? <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                    : <XCircle size={14} className="text-rose-500 mt-0.5 shrink-0" />
                  }
                  <p className="text-xs text-zinc-500 leading-relaxed">{explanation}</p>
                </div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
});

const TrueFalseOptions = React.memo(function TrueFalseOptions({
  correctAnswer, selectedOption, submitted, onSelect,
}: {
  correctAnswer: string;
  selectedOption: string | null;
  submitted: boolean;
  onSelect: (opt: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      {['true', 'false'].map(val => {
        const isSelected = selectedOption === val;
        const isCorrectOpt = val === correctAnswer;
        const showCorrect = submitted && isCorrectOpt;
        const showWrong = submitted && isSelected && !isCorrectOpt;

        return (
          <button
            key={val}
            onClick={() => onSelect(val)}
            disabled={submitted}
            className={`rounded-xl border-2 px-5 py-4 transition-all text-center ${
              showCorrect ? 'border-emerald-500/50 bg-emerald-500/10' :
              showWrong ? 'border-rose-500/50 bg-rose-500/10' :
              isSelected ? 'border-violet-500/50 bg-violet-500/10' :
              'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
            }`}
          >
            <span className={`text-sm ${
              showCorrect ? 'text-emerald-400' : showWrong ? 'text-rose-400' :
              isSelected ? 'text-violet-400' : 'text-zinc-400'
            }`}>
              {val === 'true' ? 'Verdadero' : 'Falso'}
            </span>
            {showCorrect && <CheckCircle2 size={14} className="mx-auto mt-1 text-emerald-400" />}
            {showWrong && <XCircle size={14} className="mx-auto mt-1 text-rose-400" />}
          </button>
        );
      })}
    </div>
  );
});

const OpenAnswer = React.memo(function OpenAnswer({
  textAnswer, correctAnswer, explanation, isCorrect, submitted, onTextChange, onSubmit,
}: {
  textAnswer: string;
  correctAnswer: string;
  explanation: string | null;
  isCorrect: boolean;
  submitted: boolean;
  onTextChange: (val: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="mb-6">
      <div className={`rounded-xl border-2 overflow-hidden transition-all ${
        submitted && isCorrect ? 'border-emerald-500/50 bg-emerald-500/5' :
        submitted && !isCorrect ? 'border-rose-500/50 bg-rose-500/5' :
        'border-zinc-800 bg-zinc-900'
      }`}>
        <textarea
          value={textAnswer}
          onChange={e => onTextChange(e.target.value)}
          disabled={submitted}
          placeholder="Escribe tu respuesta aqui..."
          className="w-full px-5 py-4 text-sm text-white bg-transparent resize-none outline-none placeholder:text-zinc-600 min-h-[100px]"
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !submitted) { e.preventDefault(); onSubmit(); } }}
        />
        {submitted && (
          <div className="px-5 pb-4">
            <div className="flex items-start gap-2">
              {isCorrect ? (
                <>
                  <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-emerald-400 mb-1">Respuesta correcta</p>
                    {explanation && <p className="text-xs text-zinc-500 leading-relaxed">{explanation}</p>}
                  </div>
                </>
              ) : (
                <>
                  <XCircle size={14} className="text-rose-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-rose-400 mb-1">No exactamente</p>
                    <p className="text-xs text-zinc-400 mb-1">Respuesta esperada: <span className="text-white">{correctAnswer}</span></p>
                    {explanation && <p className="text-xs text-zinc-500 leading-relaxed">{explanation}</p>}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});