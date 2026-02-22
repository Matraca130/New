// ============================================================
// Axon — Question Badges (shared)
//
// Reusable badge components for question type and difficulty.
// Used by QuizSession (student) and ProfessorQuizzesPage.
// ============================================================

import React from 'react';
import { ClipboardList, CheckCircle2, BookOpen } from 'lucide-react';

// ── Constants ─────────────────────────────────────────────

export const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Opcion Multiple', color: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
  { value: 'true_false', label: 'Verdadero / Falso', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
  { value: 'open', label: 'Respuesta Abierta', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
] as const;

export const DIFFICULTIES = [
  { value: 'easy', label: 'Facil', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'medium', label: 'Media', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { value: 'hard', label: 'Dificil', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
] as const;

export function getTypeMeta(type: string) {
  return QUESTION_TYPES.find(t => t.value === type) || QUESTION_TYPES[0];
}

export function getDifficultyMeta(diff: string) {
  return DIFFICULTIES.find(d => d.value === diff) || DIFFICULTIES[1];
}

// ── Badge Components ──────────────────────────────────────

export function QuestionTypeBadge({ type, size = 'sm' }: { type: string; size?: 'sm' | 'xs' }) {
  const textSize = size === 'xs' ? 'text-[10px]' : 'text-xs';
  const iconSize = size === 'xs' ? 10 : 12;
  const padding = size === 'xs' ? 'px-2 py-0.5' : 'px-2.5 py-1';

  if (type === 'multiple_choice') {
    return (
      <span className={`inline-flex items-center gap-1 ${textSize} ${padding} rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20`}>
        <ClipboardList size={iconSize} /> Opcion multiple
      </span>
    );
  }
  if (type === 'true_false') {
    return (
      <span className={`inline-flex items-center gap-1 ${textSize} ${padding} rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/20`}>
        <CheckCircle2 size={iconSize} /> Verdadero / Falso
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 ${textSize} ${padding} rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20`}>
      <BookOpen size={iconSize} /> Respuesta abierta
    </span>
  );
}

export function DifficultyBadge({ difficulty, size = 'sm' }: { difficulty: string; size?: 'sm' | 'xs' }) {
  const textSize = size === 'xs' ? 'text-[10px]' : 'text-xs';
  const padding = size === 'xs' ? 'px-2 py-0.5' : 'px-2.5 py-1';

  const colorMap: Record<string, string> = {
    easy: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    hard: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };
  const color = colorMap[difficulty] || colorMap.medium;
  const labelMap: Record<string, string> = { easy: 'Facil', medium: 'Media', hard: 'Dificil' };
  const label = labelMap[difficulty] || 'Media';

  return (
    <span className={`${textSize} ${padding} rounded-full border ${color}`}>
      {label}
    </span>
  );
}
