// ============================================================
// Axon — Content Tree Builder (shared, parallelized, cancellable)
//
// Builds the Semester → Section → Topic hierarchy for a course.
// Used by both QuizView (student) and ProfessorQuizzesPage.
//
// PERFORMANCE: Uses Promise.all at each level instead of
// sequential loops (fixes N+1 query anti-pattern).
//
// SAFETY: Accepts AbortSignal for cancellation on unmount
// or rapid course switching.
// ============================================================

import * as quizApi from '@/app/services/quizApi';

// ── Shared type ──────────────────────────────────────────

export interface ContentTree {
  semesters: ContentTreeSemester[];
}

export interface ContentTreeSemester {
  id: string;
  name: string;
  sections: ContentTreeSection[];
}

export interface ContentTreeSection {
  id: string;
  name: string;
  topics: ContentTreeTopic[];
}

export interface ContentTreeTopic {
  id: string;
  name: string;
}

// ── Builder ──────────────────────────────────────────────

/**
 * Build the full content tree for a course.
 *
 * @param courseId  - The course UUID
 * @param signal   - Optional AbortSignal for cancellation
 * @returns ContentTree with semesters → sections → topics
 * @throws DOMException (AbortError) if signal is aborted
 */
export async function buildContentTree(
  courseId: string,
  signal?: AbortSignal,
): Promise<ContentTree> {
  throwIfAborted(signal);

  // Level 1: Get all semesters
  const semestersRes = await quizApi.getSemesters(courseId);
  const semesters = semestersRes.items || [];

  throwIfAborted(signal);

  // Level 2: Get all sections in parallel
  const sectionsPerSemester = await Promise.all(
    semesters.map(sem => quizApi.getSections(sem.id)),
  );

  throwIfAborted(signal);

  // Level 3: Get all topics in parallel (flat, then re-group)
  const allSectionEntries: { semIdx: number; section: typeof sectionsPerSemester[0]['items'][0] }[] = [];
  sectionsPerSemester.forEach((secRes, semIdx) => {
    for (const sec of secRes.items || []) {
      allSectionEntries.push({ semIdx, section: sec });
    }
  });

  const topicsPerSection = await Promise.all(
    allSectionEntries.map(entry => quizApi.getTopics(entry.section.id)),
  );

  throwIfAborted(signal);

  // Assemble tree
  const tree: ContentTree = {
    semesters: semesters.map((sem, semIdx) => ({
      id: sem.id,
      name: sem.name,
      sections: [] as ContentTreeSection[],
    })),
  };

  allSectionEntries.forEach((entry, i) => {
    const topics = topicsPerSection[i].items || [];
    tree.semesters[entry.semIdx].sections.push({
      id: entry.section.id,
      name: entry.section.name,
      topics: topics.map(t => ({ id: t.id, name: t.name })),
    });
  });

  return tree;
}

// ── Helpers ──────────────────────────────────────────────

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('Content tree build aborted', 'AbortError');
  }
}

// ── Utility: count total topics in a tree ────────────────

export function countTopics(tree: ContentTree | null): number {
  if (!tree) return 0;
  return tree.semesters.reduce(
    (acc, sem) => acc + sem.sections.reduce(
      (a, sec) => a + sec.topics.length, 0,
    ), 0,
  );
}
