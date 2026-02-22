// ============================================================
// Axon — QuizResults
// Score display after completing a quiz session.
// ============================================================

import React, { useMemo } from 'react';
import type { QuizQuestion } from '@/app/services/quizApi';
import type { SessionResults } from './QuizSession';
import { motion } from 'motion/react';
import { Button } from '@/app/components/ui/button';
import { Trophy, RotateCw } from 'lucide-react';

interface QuizResultsProps {
  results: SessionResults;
  questions: QuizQuestion[];
  onRestart: () => void;
  onBack: () => void;
}

export function QuizResults({ results, questions, onRestart, onBack }: QuizResultsProps) {
  const pct = results.total > 0 ? Math.round((results.correct / results.total) * 100) : 0;
  // Compute once — Date.now() at first render captures the actual completion time
  const { minutes, seconds } = useMemo(() => {
    const dur = Math.round((Date.now() - results.startTime) / 1000);
    return { minutes: Math.floor(dur / 60), seconds: dur % 60 };
  }, [results.startTime]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        {/* Trophy */}
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500/30 to-indigo-500/30 border border-violet-500/30 flex items-center justify-center mx-auto mb-6"
        >
          <Trophy size={40} className="text-violet-400" />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h1 className="text-3xl text-white mb-2">Quiz Completado!</h1>
          <p className="text-zinc-500 mb-8">
            Acertaste <span className="text-white">{results.correct}</span> de <span className="text-white">{results.total}</span> preguntas
          </p>
        </motion.div>

        {/* Score Ring */}
        <ScoreRing pct={pct} />

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="grid grid-cols-3 gap-4 mb-10 max-w-sm mx-auto">
          <StatCard value={String(results.correct)} label="Correctas" color="text-emerald-400" />
          <StatCard value={String(results.total - results.correct)} label="Incorrectas" color="text-rose-400" />
          <StatCard value={`${minutes}:${seconds.toString().padStart(2, '0')}`} label="Tiempo" color="text-violet-400" />
        </motion.div>

        {/* Actions */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="flex gap-4 justify-center">
          <Button onClick={onBack} variant="outline" className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white px-6">
            Volver al Menu
          </Button>
          <Button onClick={onRestart} className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white gap-2 px-6">
            <RotateCw size={14} /> Intentar de Nuevo
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────

function ScoreRing({ pct }: { pct: number }) {
  const strokeColor = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';
  const circumference = 2 * Math.PI * 76;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="relative w-44 h-44 mx-auto mb-8">
      <svg className="w-full h-full transform -rotate-90">
        <circle cx="88" cy="88" r="76" stroke="#27272a" strokeWidth="10" fill="none" />
        <motion.circle
          cx="88" cy="88" r="76"
          stroke={strokeColor}
          strokeWidth="10" fill="none" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - pct / 100) }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl text-white">{pct}%</span>
        <span className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Score</span>
      </div>
    </motion.div>
  );
}

function StatCard({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
      <div className={`${color} text-lg`}>{value}</div>
      <div className="text-[10px] text-zinc-500 uppercase">{label}</div>
    </div>
  );
}