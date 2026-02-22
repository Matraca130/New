// ============================================================
// Axon — Student: Quiz View (connected to real backend)
//
// Orchestrates three phases: selection → session → results.
// Heavy logic extracted to hooks and sub-components.
// ============================================================

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import * as quizApi from '@/app/services/quizApi';
import type { QuizQuestion } from '@/app/services/quizApi';
import type { ContentTreeTopic } from '@/app/services/contentTreeBuilder';
import { useCourseTree } from '@/app/hooks/useCourseTree';
import { ContentTreeGrid } from '@/app/components/shared/ContentTreeGrid';
import { CourseToolbar } from '@/app/components/shared/CourseToolbar';
import { LoadingState, EmptyState } from '@/app/components/shared/FeedbackStates';
import { QuizSession } from './quiz/QuizSession';
import { QuizResults } from './quiz/QuizResults';
import type { SessionResults } from './quiz/QuizSession';
import { motion, AnimatePresence } from 'motion/react';
import {
  XCircle, AlertCircle, Brain, BookOpen,
} from 'lucide-react';

// ══════════════════════════════════════════════════════════
// ── Main QuizView ────────────────────────────────────────
// ══════════════════════════════════════════════════════════

export function QuizView() {
  const [phase, setPhase] = useState<'selection' | 'session' | 'results'>('selection');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedTopicName, setSelectedTopicName] = useState('');
  const [lastResults, setLastResults] = useState<SessionResults | null>(null);

  const createSessionAndStart = useCallback(async (courseId: string, qs: QuizQuestion[]) => {
    let sid: string | null = null;
    try {
      const session = await quizApi.createStudySession({ session_type: 'quiz', course_id: courseId || undefined });
      sid = session.id;
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[Quiz] Failed to create session:', err);
    }
    setSessionId(sid);
    setQuestions(qs);
    setPhase('session');
  }, []);

  const startQuiz = useCallback(async (courseId: string, topicName: string, qs: QuizQuestion[]) => {
    setSelectedCourseId(courseId);
    setSelectedTopicName(topicName);
    setLastResults(null);
    await createSessionAndStart(courseId, qs);
  }, [createSessionAndStart]);

  const endSession = useCallback((results: SessionResults) => {
    setLastResults(results);
    setPhase('results');
  }, []);

  // Fire-and-forget session close — runs outside the render cycle
  // so we read sessionId from a ref-like pattern via the callback arg.
  const closeSessionOnServer = useCallback((sid: string | null, results: SessionResults) => {
    if (!sid) return;
    const dur = Math.round((Date.now() - results.startTime) / 1000);
    quizApi.updateStudySession(sid, {
      ended_at: new Date().toISOString(),
      duration_seconds: dur,
      total_reviews: results.total,
      correct_reviews: results.correct,
    }).catch(err => {
      if (import.meta.env.DEV) console.warn('[Quiz] Failed to end session:', err);
    });
  }, []);

  const handleSessionComplete = useCallback((results: SessionResults) => {
    closeSessionOnServer(sessionId, results);
    endSession(results);
  }, [sessionId, closeSessionOnServer, endSession]);

  const handleRestart = useCallback(async () => {
    setLastResults(null);
    await createSessionAndStart(selectedCourseId, questions);
  }, [createSessionAndStart, selectedCourseId, questions]);

  const backToSelection = useCallback(() => {
    setPhase('selection');
    setQuestions([]);
    setSessionId(null);
    setLastResults(null);
  }, []);

  const goBackFromSession = useCallback(() => setPhase('selection'), []);

  return (
    <div className="h-full bg-zinc-950 overflow-hidden">
      <AnimatePresence mode="wait">
        {phase === 'selection' && (
          <motion.div key="selection" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }} className="h-full">
            <QuizSelection onSelect={startQuiz} />
          </motion.div>
        )}
        {phase === 'session' && (
          <motion.div key="session" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full">
            <QuizSession
              questions={questions}
              topicName={selectedTopicName}
              sessionId={sessionId}
              onComplete={handleSessionComplete}
              onBack={goBackFromSession}
            />
          </motion.div>
        )}
        {phase === 'results' && lastResults && (
          <motion.div key="results" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="h-full">
            <QuizResults
              results={lastResults}
              questions={questions}
              onRestart={handleRestart}
              onBack={backToSelection}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// ── Selection Screen ─────────────────────────────────────
// ══════════════════════════════════════════════════════════

interface QuizSelectionProps {
  onSelect: (courseId: string, topicName: string, questions: QuizQuestion[]) => void;
}

function QuizSelection({ onSelect }: QuizSelectionProps) {
  const { activeMembership } = useAuth();
  const institutionId = activeMembership?.institution_id || '';

  const {
    courses, selectedCourse, setSelectedCourse,
    coursesLoading, tree, treeLoading, totalTopics,
  } = useCourseTree(institutionId);

  const [loadingTopicId, setLoadingTopicId] = useState<string | null>(null);
  const [topicError, setTopicError] = useState<string | null>(null);

  const handleTopicClick = useCallback(async (topic: ContentTreeTopic) => {
    if (loadingTopicId) return;
    if (!selectedCourse) return; // guard against null course
    setLoadingTopicId(topic.id);
    setTopicError(null);

    try {
      const summariesRes = await quizApi.getSummaries(topic.id);
      const summaries = summariesRes.items || [];

      if (summaries.length === 0) {
        setTopicError('Este topico no tiene resumenes.');
        setLoadingTopicId(null);
        return;
      }

      const questionResults = await Promise.allSettled(
        summaries.map(s => quizApi.getQuizQuestions({ summary_id: s.id })),
      );
      const allQuestions: QuizQuestion[] = [];
      for (const result of questionResults) {
        if (result.status === 'fulfilled') {
          allQuestions.push(...(result.value.items || []));
        }
      }

      if (allQuestions.length === 0) {
        setTopicError('No hay preguntas disponibles para este topico.');
        setLoadingTopicId(null);
        return;
      }

      onSelect(selectedCourse.id, topic.name, allQuestions);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar preguntas';
      setTopicError(msg);
    } finally {
      setLoadingTopicId(null);
    }
  }, [loadingTopicId, selectedCourse, onSelect]);

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20 flex items-center justify-center">
              <Brain size={22} className="text-violet-400" />
            </div>
            <div>
              <h1 className="text-lg text-white">Quizzes</h1>
              {selectedCourse && <p className="text-sm text-zinc-500">{selectedCourse.name}</p>}
            </div>
          </div>
          <CourseToolbar
            courses={courses}
            selectedCourse={selectedCourse}
            onCourseChange={setSelectedCourse}
            treeLoading={treeLoading}
            totalTopics={totalTopics}
          />
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        <div className="max-w-5xl mx-auto space-y-10 pb-12">
          {(coursesLoading || treeLoading) && (
            <LoadingState message={coursesLoading ? 'Cargando cursos...' : 'Cargando contenido...'} />
          )}

          {!coursesLoading && courses.length === 0 && (
            <EmptyState icon={BookOpen} message="No hay cursos disponibles" />
          )}

          {topicError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-rose-400"
            >
              <AlertCircle size={14} /> {topicError}
              <button
                onClick={() => setTopicError(null)}
                className="ml-auto text-rose-500 hover:text-rose-300"
                aria-label="Cerrar error"
              >
                <XCircle size={14} />
              </button>
            </motion.div>
          )}

          {tree && (
            <ContentTreeGrid
              tree={tree}
              onTopicClick={handleTopicClick}
              loadingTopicId={loadingTopicId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
