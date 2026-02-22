// ============================================================
// Axon — useCourseTree Hook
//
// Encapsulates the repeated pattern of:
//   1. Load courses for an institution
//   2. Build the content tree when a course is selected
//   3. Handle loading/error states + cancellation
//
// Used by both QuizView (student) and ProfessorQuizzesPage.
// ============================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import * as quizApi from '@/app/services/quizApi';
import type { Course } from '@/app/services/quizApi';
import { buildContentTree, countTopics } from '@/app/services/contentTreeBuilder';
import type { ContentTree } from '@/app/services/contentTreeBuilder';

const __DEV__ = import.meta.env.DEV;

export interface UseCourseTreeReturn {
  /** All courses loaded for the institution */
  courses: Course[];
  /** Currently selected course */
  selectedCourse: Course | null;
  /** Change the selected course */
  setSelectedCourse: (course: Course | null) => void;
  /** Whether courses are loading */
  coursesLoading: boolean;
  /** The built content tree for the selected course */
  tree: ContentTree | null;
  /** Whether the tree is loading */
  treeLoading: boolean;
  /** Total topics across all semesters */
  totalTopics: number;
}

export function useCourseTree(institutionId: string): UseCourseTreeReturn {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [tree, setTree] = useState<ContentTree | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);

  // ── Load courses ────────────────────────────────────
  useEffect(() => {
    if (!institutionId) {
      setCoursesLoading(false);
      setCourses([]);
      setSelectedCourse(null);
      return;
    }

    let cancelled = false;
    setCoursesLoading(true);

    quizApi.getCourses(institutionId)
      .then(res => {
        if (cancelled) return;
        const items = res.items || [];
        setCourses(items);
        if (items.length > 0) setSelectedCourse(items[0]);
      })
      .catch(err => {
        if (!cancelled && __DEV__) console.error('[useCourseTree] Load courses:', err);
      })
      .finally(() => {
        if (!cancelled) setCoursesLoading(false);
      });

    return () => { cancelled = true; };
  }, [institutionId]);

  // ── Build tree when course changes ──────────────────
  useEffect(() => {
    if (!selectedCourse) {
      setTree(null);
      return;
    }

    const abortCtrl = new AbortController();
    setTreeLoading(true);
    setTree(null);

    buildContentTree(selectedCourse.id, abortCtrl.signal)
      .then(result => {
        if (!abortCtrl.signal.aborted) setTree(result);
      })
      .catch(err => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (__DEV__) console.error('[useCourseTree] Build tree:', err);
      })
      .finally(() => {
        if (!abortCtrl.signal.aborted) setTreeLoading(false);
      });

    return () => abortCtrl.abort();
  }, [selectedCourse]);

  const totalTopics = useMemo(() => countTopics(tree), [tree]);

  return {
    courses,
    selectedCourse,
    setSelectedCourse,
    coursesLoading,
    tree,
    treeLoading,
    totalTopics,
  };
}