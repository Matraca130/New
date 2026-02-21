import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Course, Topic, courses } from '@/data/courses';

// @refresh reset

// ── View ↔ Route mapping ─────────────────────────────────────
// The single source of truth for how viewType strings map to URL slugs.
// Views call `setActiveView('flashcards')` → navigate('/student/flashcards').
// The URL path `/student/flashcards` → activeView resolves to 'flashcards'.
//
// To ADD a new view:
//   1. Add the slug to ViewType
//   2. Add an entry here (only if slug !== viewType)
//   3. Add the route in routes.tsx

export type ViewType =
  | 'home'
  | 'dashboard'
  | 'study-hub'
  | 'study'
  | 'flashcards'
  | 'quiz'
  | '3d'
  | 'schedule'
  | 'organize-study'
  | 'review-session'
  | 'study-dashboards'
  | 'knowledge-heatmap'
  | 'mastery-dashboard'
  | 'student-data';

export type ThemeType = 'dark' | 'light';

/** viewType → URL slug (only entries that differ from the viewType itself) */
const VIEW_TO_SLUG: Partial<Record<string, string>> = {
  home: '',                       // index route
};

/** URL slug → viewType (only entries that differ from the slug itself) */
const SLUG_TO_VIEW: Record<string, ViewType> = {
  '': 'home',                    // index route
};

function viewToPath(view: string): string {
  const slug = VIEW_TO_SLUG[view] ?? view;
  return slug ? `/student/${slug}` : '/student';
}

function pathToView(pathname: string): ViewType {
  // Extract the slug after /student/
  const match = pathname.match(/^\/student\/?(.*)$/);
  const slug = match?.[1]?.split('/')[0] ?? '';
  return (SLUG_TO_VIEW[slug] ?? (slug || 'home')) as ViewType;
}

// ── Types ────────────────────────────────────────────────────

export interface StudyPlanTask {
  id: string;
  date: Date;
  title: string;
  subject: string;
  subjectColor: string;
  method: string;
  estimatedMinutes: number;
  completed: boolean;
}

export interface StudyPlan {
  id: string;
  name: string;
  subjects: { id: string; name: string; color: string }[];
  methods: string[];
  selectedTopics: { courseId: string; courseName: string; sectionTitle: string; topicTitle: string; topicId: string }[];
  completionDate: Date;
  weeklyHours: number[]; // [mon, tue, wed, thu, fri, sat, sun]
  tasks: StudyPlanTask[];
  createdAt: Date;
  totalEstimatedHours: number;
}

interface AppContextType {
  currentCourse: Course;
  setCurrentCourse: (course: Course) => void;
  currentTopic: Topic | null;
  setCurrentTopic: (topic: Topic) => void;
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
  isStudySessionActive: boolean;
  setStudySessionActive: (active: boolean) => void;
  studyPlans: StudyPlan[];
  addStudyPlan: (plan: StudyPlan) => void;
  toggleTaskComplete: (planId: string, taskId: string) => void;
  quizAutoStart: boolean;
  setQuizAutoStart: (v: boolean) => void;
  flashcardAutoStart: boolean;
  setFlashcardAutoStart: (v: boolean) => void;
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const noop = () => {};

const defaultContextValue: AppContextType = {
  currentCourse: courses[0],
  setCurrentCourse: noop,
  currentTopic: courses[0].semesters[0].sections[0].topics[0],
  setCurrentTopic: noop,
  activeView: 'home',
  setActiveView: noop,
  isSidebarOpen: true,
  setSidebarOpen: noop,
  isStudySessionActive: false,
  setStudySessionActive: noop,
  studyPlans: [],
  addStudyPlan: noop,
  toggleTaskComplete: noop,
  quizAutoStart: false,
  setQuizAutoStart: noop,
  flashcardAutoStart: false,
  setFlashcardAutoStart: noop,
  theme: 'light',
  setTheme: noop,
};

const AppContext = createContext<AppContextType>(defaultContextValue);

// ── Provider ─────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  // activeView is DERIVED from the URL — single source of truth
  const activeView = useMemo(() => pathToView(location.pathname), [location.pathname]);

  // setActiveView is a BRIDGE: old views call it, we translate to navigate()
  const setActiveView = useCallback((view: ViewType) => {
    const target = viewToPath(view as string);
    navigate(target);
  }, [navigate]);

  const [currentCourse, setCurrentCourse] = useState<Course>(courses[0]);
  const defaultTopic = courses[0].semesters[0].sections[0].topics[0];
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(defaultTopic);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isStudySessionActive, setStudySessionActive] = useState(false);
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [quizAutoStart, setQuizAutoStart] = useState(false);
  const [flashcardAutoStart, setFlashcardAutoStart] = useState(false);
  const [theme, setTheme] = useState<ThemeType>('light');

  const addStudyPlan = useCallback((plan: StudyPlan) => {
    setStudyPlans(prev => [...prev, plan]);
  }, []);

  const toggleTaskComplete = useCallback((planId: string, taskId: string) => {
    setStudyPlans(prev => prev.map(plan => {
      if (plan.id !== planId) return plan;
      return {
        ...plan,
        tasks: plan.tasks.map(task =>
          task.id === taskId ? { ...task, completed: !task.completed } : task
        )
      };
    }));
  }, []);

  const value = useMemo<AppContextType>(() => ({
    currentCourse,
    setCurrentCourse,
    currentTopic,
    setCurrentTopic,
    activeView,
    setActiveView,
    isSidebarOpen,
    setSidebarOpen,
    isStudySessionActive,
    setStudySessionActive,
    studyPlans,
    addStudyPlan,
    toggleTaskComplete,
    quizAutoStart,
    setQuizAutoStart,
    flashcardAutoStart,
    setFlashcardAutoStart,
    theme,
    setTheme,
  }), [
    currentCourse, currentTopic, activeView, setActiveView,
    isSidebarOpen, isStudySessionActive, studyPlans, addStudyPlan,
    toggleTaskComplete, quizAutoStart, flashcardAutoStart, theme,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}