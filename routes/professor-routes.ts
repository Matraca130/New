// ============================================================
// Axon — Professor Routes (children of ProfessorLayout)
//
// ADDING A NEW PROFESSOR PAGE:
//   1. Create the component in /src/app/components/roles/pages/professor/
//   2. Import it here
//   3. Add { path: 'my-slug', Component: MyPage }
//   That's it — no other files need changes.
//
// PARALLEL-SAFE: Only professor-area devs touch this file.
// ============================================================
import type { RouteObject } from 'react-router';

import { ProfessorDashboardPage } from '@/roles/pages/professor/ProfessorDashboardPage';
import { ProfessorCoursesPage } from '@/roles/pages/professor/ProfessorCoursesPage';
import { ProfessorCurriculumPage } from '@/roles/pages/professor/ProfessorCurriculumPage';
import { ProfessorFlashcardsPage } from '@/roles/pages/professor/ProfessorFlashcardsPage';
import { ProfessorQuizzesPage } from '@/roles/pages/professor/ProfessorQuizzesPage';
import { ProfessorStudentsPage } from '@/roles/pages/professor/ProfessorStudentsPage';
import { ProfessorAIPage } from '@/roles/pages/professor/ProfessorAIPage';
import { ProfessorSettingsPage } from '@/roles/pages/professor/ProfessorSettingsPage';

export const professorChildren: RouteObject[] = [
  { index: true,        Component: ProfessorDashboardPage },
  { path: 'courses',    Component: ProfessorCoursesPage },
  { path: 'curriculum', Component: ProfessorCurriculumPage },
  { path: 'flashcards', Component: ProfessorFlashcardsPage },
  { path: 'quizzes',    Component: ProfessorQuizzesPage },
  { path: 'students',   Component: ProfessorStudentsPage },
  { path: 'ai',         Component: ProfessorAIPage },
  { path: 'settings',   Component: ProfessorSettingsPage },
];
