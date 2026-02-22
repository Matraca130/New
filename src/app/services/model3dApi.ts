// ============================================================
// Axon — 3D Models API Service
//
// Covers: models-3d, model-3d-pins, model-3d-notes,
//         plus hierarchy browsing (courses → topics)
// ============================================================
import { realRequest } from '@/app/services/apiConfig';

// ── Types ────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// Hierarchy types
export interface ApiCourse {
  id: string;
  institution_id: string;
  title: string;
  description?: string;
  color?: string;
  icon?: string;
  is_active: boolean;
  order_index: number;
  created_at: string;
}

export interface ApiSemester {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  created_at: string;
}

export interface ApiSection {
  id: string;
  semester_id: string;
  title: string;
  description?: string;
  order_index: number;
  created_at: string;
}

export interface ApiTopic {
  id: string;
  section_id: string;
  title: string;
  description?: string;
  order_index: number;
  created_at: string;
}

// 3D Model types
export interface ApiModel3D {
  id: string;
  topic_id: string;
  title: string;
  file_url: string;
  file_format?: string;
  thumbnail_url?: string;
  file_size_bytes?: number;
  order_index: number;
  is_active: boolean;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiModel3DPin {
  id: string;
  model_id: string;
  keyword_id?: string;
  pin_type?: string;       // "annotation" | "label" | "link"
  geometry: { x: number; y: number; z: number };
  normal?: { x: number; y: number; z: number };
  label?: string;
  color?: string;
  description?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface ApiModel3DNote {
  id: string;
  model_id: string;
  user_id: string;
  geometry?: { x: number; y: number; z: number };
  note: string;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

// ── Hierarchy API ────────────────────────────────────────────

export async function fetchCourses(institutionId: string, limit = 100, offset = 0) {
  return realRequest<PaginatedResponse<ApiCourse>>(
    `/courses?institution_id=${institutionId}&limit=${limit}&offset=${offset}`
  );
}

export async function fetchSemesters(institutionId: string, courseId: string, limit = 100, offset = 0) {
  return realRequest<PaginatedResponse<ApiSemester>>(
    `/semesters?institution_id=${institutionId}&course_id=${courseId}&limit=${limit}&offset=${offset}`
  );
}

export async function fetchSections(institutionId: string, semesterId: string, limit = 100, offset = 0) {
  return realRequest<PaginatedResponse<ApiSection>>(
    `/sections?institution_id=${institutionId}&semester_id=${semesterId}&limit=${limit}&offset=${offset}`
  );
}

export async function fetchTopics(institutionId: string, sectionId: string, limit = 100, offset = 0) {
  return realRequest<PaginatedResponse<ApiTopic>>(
    `/topics?institution_id=${institutionId}&section_id=${sectionId}&limit=${limit}&offset=${offset}`
  );
}

// ── Models 3D CRUD ───────────────────────────────────────────

export async function fetchModels3D(institutionId: string, topicId: string, limit = 100, offset = 0, includeDeleted = false) {
  let url = `/models-3d?institution_id=${institutionId}&topic_id=${topicId}&limit=${limit}&offset=${offset}`;
  if (includeDeleted) url += '&include_deleted=true';
  return realRequest<PaginatedResponse<ApiModel3D>>(url);
}

export async function fetchModel3D(institutionId: string, id: string) {
  return realRequest<ApiModel3D>(`/models-3d/${id}?institution_id=${institutionId}`);
}

export async function createModel3D(institutionId: string, data: {
  topic_id: string;
  title: string;
  file_url: string;
  file_format?: string;
  thumbnail_url?: string;
  file_size_bytes?: number;
  order_index?: number;
}) {
  return realRequest<ApiModel3D>('/models-3d', {
    method: 'POST',
    body: JSON.stringify({ ...data, institution_id: institutionId }),
  });
}

export async function updateModel3D(institutionId: string, id: string, data: Partial<{
  title: string;
  file_url: string;
  file_format: string;
  thumbnail_url: string;
  file_size_bytes: number;
  order_index: number;
  is_active: boolean;
}>) {
  return realRequest<ApiModel3D>(`/models-3d/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ ...data, institution_id: institutionId }),
  });
}

export async function deleteModel3D(institutionId: string, id: string) {
  return realRequest<void>(`/models-3d/${id}?institution_id=${institutionId}`, { method: 'DELETE' });
}

export async function restoreModel3D(institutionId: string, id: string) {
  return realRequest<ApiModel3D>(`/models-3d/${id}/restore?institution_id=${institutionId}`, { method: 'PUT' });
}

// ── Pins CRUD ────────────────────────────────────────────────

export async function fetchPins(institutionId: string, modelId: string, keywordId?: string) {
  let url = `/model-3d-pins?institution_id=${institutionId}&model_id=${modelId}`;
  if (keywordId) url += `&keyword_id=${keywordId}`;
  return realRequest<PaginatedResponse<ApiModel3DPin>>(url);
}

export async function fetchPin(institutionId: string, id: string) {
  return realRequest<ApiModel3DPin>(`/model-3d-pins/${id}?institution_id=${institutionId}`);
}

export async function createPin(institutionId: string, data: {
  model_id: string;
  geometry: { x: number; y: number; z: number };
  keyword_id?: string;
  pin_type?: string;
  normal?: { x: number; y: number; z: number };
  label?: string;
  color?: string;
  description?: string;
  order_index?: number;
}) {
  return realRequest<ApiModel3DPin>('/model-3d-pins', {
    method: 'POST',
    body: JSON.stringify({ ...data, institution_id: institutionId }),
  });
}

export async function updatePin(institutionId: string, id: string, data: Partial<{
  keyword_id: string;
  pin_type: string;
  geometry: { x: number; y: number; z: number };
  normal: { x: number; y: number; z: number };
  label: string;
  color: string;
  description: string;
  order_index: number;
}>) {
  return realRequest<ApiModel3DPin>(`/model-3d-pins/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ ...data, institution_id: institutionId }),
  });
}

export async function deletePin(institutionId: string, id: string) {
  return realRequest<void>(`/model-3d-pins/${id}?institution_id=${institutionId}`, { method: 'DELETE' });
}

// ── Student Notes CRUD ───────────────────────────────────────

export async function fetchNotes(institutionId: string, modelId: string, includeDeleted = false) {
  let url = `/model-3d-notes?institution_id=${institutionId}&model_id=${modelId}`;
  if (includeDeleted) url += '&include_deleted=true';
  return realRequest<PaginatedResponse<ApiModel3DNote>>(url);
}

export async function fetchNote(institutionId: string, id: string) {
  return realRequest<ApiModel3DNote>(`/model-3d-notes/${id}?institution_id=${institutionId}`);
}

export async function createNote(institutionId: string, data: {
  model_id: string;
  note: string;
  geometry?: { x: number; y: number; z: number };
}) {
  return realRequest<ApiModel3DNote>('/model-3d-notes', {
    method: 'POST',
    body: JSON.stringify({ ...data, institution_id: institutionId }),
  });
}

export async function updateNote(institutionId: string, id: string, data: Partial<{
  note: string;
  geometry: { x: number; y: number; z: number };
}>) {
  return realRequest<ApiModel3DNote>(`/model-3d-notes/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ ...data, institution_id: institutionId }),
  });
}

export async function deleteNote(institutionId: string, id: string) {
  return realRequest<void>(`/model-3d-notes/${id}?institution_id=${institutionId}`, { method: 'DELETE' });
}

export async function restoreNote(institutionId: string, id: string) {
  return realRequest<ApiModel3DNote>(`/model-3d-notes/${id}/restore?institution_id=${institutionId}`, { method: 'PUT' });
}