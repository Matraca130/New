// ============================================================
// Axon — Feedback State Components (shared)
//
// Reusable loading, empty, and error state displays.
// ============================================================

import React from 'react';
import type { ReactNode } from 'react';
import { Loader2, BookOpen, AlertCircle, type LucideIcon } from 'lucide-react';

// ── Loading State ─────────────────────────────────────────

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = 'Cargando...', className = 'py-20' }: LoadingStateProps) {
  return (
    <div className={`flex items-center justify-center text-zinc-500 gap-2 ${className}`}>
      <Loader2 size={18} className="animate-spin" />
      <span className="text-sm">{message}</span>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────

interface EmptyStateProps {
  icon?: LucideIcon;
  message: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = BookOpen,
  message,
  action,
  className = 'py-20',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-zinc-600 ${className}`}>
      <Icon size={48} className="mb-4 text-zinc-800" />
      <p className="text-sm">{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

// ── Error State ───────────────────────────────────────────

interface ErrorStateProps {
  message: string;
  className?: string;
}

export function ErrorState({ message, className = 'py-16' }: ErrorStateProps) {
  return (
    <div className={`flex items-center justify-center gap-2 text-rose-400 text-sm ${className}`}>
      <AlertCircle size={16} /> {message}
    </div>
  );
}
