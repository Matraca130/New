// ============================================================
// Axon — Quiz API Service
//
// All quiz-related API calls for professor CRUD and student sessions.
// Uses realRequest from apiConfig.ts (correct headers, unwrap).
//
// Factory CRUD responses are paginated:
//   { items: [...], total: N, limit: N, offset: N }
// (after realRequest unwraps the outer { data: ... })
// ============================================================

import { realRequest } from '@/app/services/apiConfig';

// ── Types ─────────────────────────────────────────────────

export interface Paginated<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface QuizQuestion {
  id: string;
  summary_id: string;
  keyword_id: string | null;
  question_type: 'multiple_choice' | 'true_false' | 'open';
  question: string;
  options: string[] | null;
  correct_answer: string;
  explanation: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  source: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuizAttempt {
  id: string;
  quiz_question_id: string;
  user_id: string;
  answer: string;
  is_correct: boolean;
  session_id: string | null;
  time_taken_ms: number | null;
  created_at: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  session_type: string;
  course_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  total_reviews: number | null;
  correct_reviews: number | null;
  created_at: string;
}

export interface Course {
  id: string;
  institution_id: string;
  name: string;
  description: string | null;
  color: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Semester {
  id: string;
  course_id: string;
  name: string;
  order_index: number;
  is_active: boolean;
}

export interface Section {
  id: string;
  semester_id: string;
  name: string;
  order_index: number;
  is_active: boolean;
}

export interface Topic {
  id: string;
  section_id: string;
  name: string;
  order_index: number;
  is_active: boolean;
}

export interface Summary {
  id: string;
  topic_id: string;
  institution_id: string | null;
  title: string | null;
  content_markdown: string | null;
  status: string;
  is_active: boolean;
  created_at: string;
}

// ── Content Hierarchy ─────────────────────────────────────

export async function getCourses(institutionId: string): Promise<Paginated<Course>> {
  return realRequest<Paginated<Course>>(`/courses?institution_id=${institutionId}&limit=100`);
}

export async function getSemesters(courseId: string): Promise<Paginated<Semester>> {
  return realRequest<Paginated<Semester>>(`/semesters?course_id=${courseId}&limit=100`);
}

export async function getSections(semesterId: string): Promise<Paginated<Section>> {
  return realRequest<Paginated<Section>>(`/sections?semester_id=${semesterId}&limit=100`);
}

export async function getTopics(sectionId: string): Promise<Paginated<Topic>> {
  return realRequest<Paginated<Topic>>(`/topics?section_id=${sectionId}&limit=100`);
}

export async function getSummaries(topicId: string): Promise<Paginated<Summary>> {
  return realRequest<Paginated<Summary>>(`/summaries?topic_id=${topicId}&limit=100`);
}

// ── Quiz Questions CRUD ───────────────────────────────────

export interface QuizQuestionFilters {
  summary_id: string;
  keyword_id?: string;
  question_type?: string;
  difficulty?: string;
  limit?: number;
  offset?: number;
}

export async function getQuizQuestions(filters: QuizQuestionFilters): Promise<Paginated<QuizQuestion>> {
  const params = new URLSearchParams();
  params.set('summary_id', filters.summary_id);
  if (filters.keyword_id) params.set('keyword_id', filters.keyword_id);
  if (filters.question_type) params.set('question_type', filters.question_type);
  if (filters.difficulty) params.set('difficulty', filters.difficulty);
  params.set('limit', String(filters.limit || 100));
  if (filters.offset) params.set('offset', String(filters.offset));
  return realRequest<Paginated<QuizQuestion>>(`/quiz-questions?${params}`);
}

export async function getQuizQuestion(id: string): Promise<QuizQuestion> {
  return realRequest<QuizQuestion>(`/quiz-questions/${id}`);
}

export interface CreateQuizQuestionPayload {
  summary_id: string;
  keyword_id?: string;
  question_type: string;
  question: string;
  correct_answer: string;
  options?: string[];
  explanation?: string;
  difficulty?: string;
  source?: string;
}

export async function createQuizQuestion(data: CreateQuizQuestionPayload): Promise<QuizQuestion> {
  return realRequest<QuizQuestion>('/quiz-questions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateQuizQuestion(id: string, data: Partial<QuizQuestion>): Promise<QuizQuestion> {
  return realRequest<QuizQuestion>(`/quiz-questions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteQuizQuestion(id: string): Promise<void> {
  await realRequest(`/quiz-questions/${id}`, { method: 'DELETE' });
}

export async function restoreQuizQuestion(id: string): Promise<QuizQuestion> {
  return realRequest<QuizQuestion>(`/quiz-questions/${id}/restore`, { method: 'PUT' });
}

// ── Quiz Attempts (Student) ───────────────────────────────

export interface CreateQuizAttemptPayload {
  quiz_question_id: string;
  answer: string;
  is_correct: boolean;
  session_id?: string;
  time_taken_ms?: number;
}

export async function createQuizAttempt(data: CreateQuizAttemptPayload): Promise<QuizAttempt> {
  return realRequest<QuizAttempt>('/quiz-attempts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getQuizAttempts(params: { quiz_question_id?: string; session_id?: string }): Promise<QuizAttempt[]> {
  const qs = new URLSearchParams();
  if (params.quiz_question_id) qs.set('quiz_question_id', params.quiz_question_id);
  if (params.session_id) qs.set('session_id', params.session_id);
  return realRequest<QuizAttempt[]>(`/quiz-attempts?${qs}`);
}

// ── Study Sessions ────────────────────────────────────────

export async function createStudySession(data: { session_type: string; course_id?: string }): Promise<StudySession> {
  return realRequest<StudySession>('/study-sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateStudySession(id: string, data: {
  ended_at?: string;
  duration_seconds?: number;
  total_reviews?: number;
  correct_reviews?: number;
}): Promise<StudySession> {
  return realRequest<StudySession>(`/study-sessions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
