// ============================================================
// Axon — Student Routes (children of StudentLayout)
//
// ADDING A NEW STUDENT VIEW:
//   1. Create the component in /src/app/components/content/
//   2. Import it here
//   3. Add { path: 'my-slug', Component: MyView }
//   That's it — no other files need changes.
//
// PARALLEL-SAFE: Only student devs touch this file.
// ============================================================
import type { RouteObject } from 'react-router';

import { WelcomeView } from '@/content/WelcomeView';
import { DashboardView } from '@/content/DashboardView';
import { StudyHubView } from '@/content/StudyHubView';
import { StudyView } from '@/content/StudyView';
import { FlashcardView } from '@/content/FlashcardView';
import { ThreeDView } from '@/content/ThreeDView';
import { QuizView } from '@/content/QuizView';
import { ScheduleView } from '@/content/ScheduleView';
import { StudyOrganizerWizard } from '@/content/StudyOrganizerWizard';
import { ReviewSessionView } from '@/content/ReviewSessionView';
import { StudyDashboardsView } from '@/content/StudyDashboardsView';
import { KnowledgeHeatmapView } from '@/content/KnowledgeHeatmapView';
import { MasteryDashboardView } from '@/content/MasteryDashboardView';
import { StudentDataPanel } from '@/content/StudentDataPanel';

export const studentChildren: RouteObject[] = [
  { index: true,                    Component: WelcomeView },
  { path: 'dashboard',              Component: DashboardView },
  { path: 'study-hub',              Component: StudyHubView },
  { path: 'study',                  Component: StudyView },
  { path: 'flashcards',             Component: FlashcardView },
  { path: '3d',                     Component: ThreeDView },
  { path: 'quiz',                   Component: QuizView },
  { path: 'schedule',               Component: ScheduleView },
  { path: 'organize-study',         Component: StudyOrganizerWizard },
  { path: 'review-session',         Component: ReviewSessionView },
  { path: 'study-dashboards',       Component: StudyDashboardsView },
  { path: 'knowledge-heatmap',      Component: KnowledgeHeatmapView },
  { path: 'mastery-dashboard',      Component: MasteryDashboardView },
  { path: 'student-data',           Component: StudentDataPanel },
];
