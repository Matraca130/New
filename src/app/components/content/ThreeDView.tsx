// ============================================================
// Axon — ThreeDView (Student Atlas 3D — API driven)
//
// Browses hierarchy: Course → Semester → Section → Topic → Model
// Fetches all data from backend API.
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ModelViewer3D } from '@/app/components/content/ModelViewer3D';
import {
  Box, ChevronRight, ChevronLeft, Search, Loader2, AlertCircle,
  BookOpen, Layers, ChevronDown,
} from 'lucide-react';
import clsx from 'clsx';
import * as api from '@/app/services/model3dApi';
import type {
  ApiCourse, ApiSemester, ApiSection, ApiTopic, ApiModel3D,
} from '@/app/services/model3dApi';
import { useAuth } from '@/app/context/AuthContext';

// ── View state ──
type ViewState = 'courses' | 'topics' | 'viewer';

// ── Aggregated hierarchy node ──
interface TopicWithModels {
  topic: ApiTopic;
  section: ApiSection;
  semester: ApiSemester;
  models: ApiModel3D[];
}

export function ThreeDView() {
  const { activeMembership } = useAuth();
  const instId = activeMembership?.institution_id ?? '';

  // Navigation state
  const [viewState, setViewState] = useState<ViewState>('courses');
  const [courses, setCourses] = useState<ApiCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<ApiCourse | null>(null);
  const [topicsWithModels, setTopicsWithModels] = useState<TopicWithModels[]>([]);
  const [selectedModel, setSelectedModel] = useState<{ model: ApiModel3D; topic: ApiTopic } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Loading / error
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch courses on mount ──
  useEffect(() => {
    if (!instId) return;
    (async () => {
      try {
        setLoadingCourses(true);
        const res = await api.fetchCourses(instId);
        setCourses(res.items || []);
      } catch (err: any) {
        console.error('[3D] fetchCourses error:', err);
        setError(err.message || 'Error al cargar cursos');
      } finally {
        setLoadingCourses(false);
      }
    })();
  }, [instId]);

  // ── Load full hierarchy for a course (semesters → sections → topics → models) ──
  // Uses Promise.all at each level to parallelize API calls.
  const loadCourseHierarchy = useCallback(async (course: ApiCourse) => {
    if (!instId) return;
    setLoadingTopics(true);
    setError(null);
    setSelectedCourse(course);
    setViewState('topics');

    try {
      // Level 1: fetch all semesters
      const semRes = await api.fetchSemesters(instId, course.id);
      const semesters = semRes.items || [];

      // Level 2: fetch all sections in parallel across semesters
      const sectionsByPair = await Promise.all(
        semesters.map(async (semester) => {
          const secRes = await api.fetchSections(instId, semester.id);
          return (secRes.items || []).map((section) => ({ semester, section }));
        })
      );
      const allSections = sectionsByPair.flat();

      // Level 3: fetch all topics in parallel across sections
      const topicsByPair = await Promise.all(
        allSections.map(async ({ semester, section }) => {
          const topicRes = await api.fetchTopics(instId, section.id);
          return (topicRes.items || []).map((topic) => ({ semester, section, topic }));
        })
      );
      const allTopics = topicsByPair.flat();

      // Level 4: fetch all models in parallel across topics
      const result: TopicWithModels[] = [];
      const modelResults = await Promise.all(
        allTopics.map(async ({ semester, section, topic }) => {
          const modelRes = await api.fetchModels3D(instId, topic.id);
          const models = (modelRes.items || []).filter(m => m.is_active);
          return { semester, section, topic, models };
        })
      );

      for (const { semester, section, topic, models } of modelResults) {
        if (models.length > 0) {
          result.push({ topic, section, semester, models });
        }
      }

      setTopicsWithModels(result);
    } catch (err: any) {
      console.error('[3D] loadCourseHierarchy error:', err);
      setError(err.message || 'Error al cargar jerarquia');
    } finally {
      setLoadingTopics(false);
    }
  }, [instId]);

  // ── Open viewer ──
  const openViewer = (model: ApiModel3D, topic: ApiTopic) => {
    setSelectedModel({ model, topic });
    setViewState('viewer');
  };

  // ── Go back ──
  const goBack = () => {
    if (viewState === 'viewer') {
      setViewState('topics');
      setSelectedModel(null);
    } else if (viewState === 'topics') {
      setViewState('courses');
      setSelectedCourse(null);
      setTopicsWithModels([]);
    }
  };

  // ── Filter topics by search ──
  const filteredTopics = searchQuery.trim()
    ? topicsWithModels.filter(t =>
        t.topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.models.some(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : topicsWithModels;

  // ── Total model count ──
  const totalModels = topicsWithModels.reduce((sum, t) => sum + t.models.length, 0);

  return (
    <AnimatePresence mode="wait">
      {viewState === 'courses' && (
        <motion.div key="courses" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <CoursesScreen
            courses={courses}
            loading={loadingCourses}
            error={error}
            onSelectCourse={loadCourseHierarchy}
          />
        </motion.div>
      )}
      {viewState === 'topics' && selectedCourse && (
        <motion.div key="topics" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
          <TopicsScreen
            course={selectedCourse}
            topics={filteredTopics}
            totalModels={totalModels}
            loading={loadingTopics}
            error={error}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onBack={goBack}
            onOpenModel={openViewer}
          />
        </motion.div>
      )}
      {viewState === 'viewer' && selectedModel && (
        <motion.div key="viewer" className="h-full" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.25 }}>
          <ViewerScreen
            model={selectedModel.model}
            topic={selectedModel.topic}
            onBack={goBack}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ══════════════════════════════════════════════
// ── Level 1: Courses Screen ──
// ══════════════════════════════════════════════
function CoursesScreen({
  courses, loading, error, onSelectCourse,
}: {
  courses: ApiCourse[];
  loading: boolean;
  error: string | null;
  onSelectCourse: (c: ApiCourse) => void;
}) {
  return (
    <div className="flex flex-col min-h-full bg-zinc-950">
      {/* Header */}
      <div className="px-6 pt-6 pb-5 border-b border-white/5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
            <Box size={18} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Atlas 3D</h1>
            <p className="text-xs text-gray-500">Explora modelos anatomicos interactivos</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={28} className="text-violet-400 animate-spin mb-3" />
            <p className="text-sm text-gray-500">Cargando cursos...</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertCircle size={28} className="text-red-400 mb-3" />
            <p className="text-sm text-red-400 mb-2">{error}</p>
            <button onClick={() => window.location.reload()} className="text-xs text-violet-400 hover:underline">
              Intentar de nuevo
            </button>
          </div>
        )}

        {!loading && !error && courses.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <BookOpen size={32} className="text-gray-600 mb-3" />
            <p className="text-sm text-gray-500">Ningun curso disponible</p>
          </div>
        )}

        {!loading && !error && courses.length > 0 && (
          <>
            <p className="text-xs text-gray-600 mb-4">Selecciona un curso para explorar sus modelos 3D</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map(course => (
                <motion.button
                  key={course.id}
                  onClick={() => onSelectCourse(course)}
                  whileHover={{ y: -2, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative bg-zinc-900 hover:bg-zinc-800/80 rounded-xl border border-white/5 hover:border-violet-500/20 p-5 text-left transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/15 flex items-center justify-center">
                      <BookOpen size={18} className="text-violet-400" />
                    </div>
                    <ChevronRight size={16} className="text-gray-700 group-hover:text-violet-400 transition-colors" />
                  </div>
                  <h3 className="font-semibold text-white text-sm mb-1">{course.title}</h3>
                  {course.description && (
                    <p className="text-[11px] text-gray-500 line-clamp-2">{course.description}</p>
                  )}
                </motion.button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// ── Level 2: Topics with Models Screen ──
// ══════════════════════════════════════════════
function TopicsScreen({
  course, topics, totalModels, loading, error,
  searchQuery, setSearchQuery, onBack, onOpenModel,
}: {
  course: ApiCourse;
  topics: TopicWithModels[];
  totalModels: number;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onBack: () => void;
  onOpenModel: (m: ApiModel3D, t: ApiTopic) => void;
}) {
  // Group by section
  const groupedBySection = topics.reduce<Record<string, { section: ApiSection; semester: ApiSemester; items: TopicWithModels[] }>>((acc, t) => {
    if (!acc[t.section.id]) {
      acc[t.section.id] = { section: t.section, semester: t.semester, items: [] };
    }
    acc[t.section.id].items.push(t);
    return acc;
  }, {});

  const sections = Object.values(groupedBySection);

  return (
    <div className="flex flex-col min-h-full bg-zinc-950">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-gray-500 hover:text-white text-xs transition-colors">
            <ChevronLeft size={14} />
            <span>Cursos</span>
          </button>
          <div className="flex items-center gap-3">
            {!loading && (
              <span className="text-[10px] text-gray-600">
                <span className="font-semibold text-violet-400">{totalModels}</span> modelos en{' '}
                <span className="font-semibold text-gray-400">{topics.length}</span> tópicos
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">{course.title}</h1>
            <p className="text-xs text-gray-500 mt-0.5">Modelos 3D disponibles</p>
          </div>
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              placeholder="Buscar modelo..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-4 py-1.5 text-[11px] bg-zinc-900 border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-violet-500/40 w-48"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 space-y-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={28} className="text-violet-400 animate-spin mb-3" />
            <p className="text-sm text-gray-500">Buscando modelos 3D...</p>
            <p className="text-[10px] text-gray-700 mt-1">Recorriendo semestres, secciones y topicos</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertCircle size={28} className="text-red-400 mb-3" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {!loading && !error && topics.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <Box size={32} className="text-gray-700 mb-3" />
            <p className="text-sm text-gray-500">Ningun modelo 3D encontrado en este curso</p>
            <p className="text-[11px] text-gray-700 mt-1">Los profesores aun no han agregado modelos</p>
          </div>
        )}

        {!loading && !error && sections.map(({ section, semester, items }) => (
          <SectionGroup
            key={section.id}
            section={section}
            semester={semester}
            items={items}
            onOpenModel={onOpenModel}
          />
        ))}
      </div>
    </div>
  );
}

// ── Section group with expandable topics ──
function SectionGroup({
  section, semester, items, onOpenModel,
}: {
  section: ApiSection;
  semester: ApiSemester;
  items: TopicWithModels[];
  onOpenModel: (m: ApiModel3D, t: ApiTopic) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const modelCount = items.reduce((s, t) => s + t.models.length, 0);

  return (
    <div>
      {/* Section header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 w-full group mb-3"
      >
        <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/15 flex items-center justify-center">
          <Layers size={14} className="text-violet-400" />
        </div>
        <div className="flex-1 text-left">
          <h3 className="text-sm font-semibold text-white">{section.title}</h3>
          <p className="text-[10px] text-gray-600">{semester.title} &middot; {modelCount} modelo{modelCount !== 1 ? 's' : ''}</p>
        </div>
        <ChevronDown
          size={14}
          className={clsx(
            "text-gray-600 transition-transform",
            expanded ? "rotate-0" : "-rotate-90"
          )}
        />
      </button>

      {/* Models grid */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pl-10 pb-2">
              {items.flatMap(({ topic, models }) =>
                models.map(model => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    topicTitle={topic.title}
                    onOpen={() => onOpenModel(model, topic)}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Model card ──
function ModelCard({
  model, topicTitle, onOpen,
}: {
  model: ApiModel3D;
  topicTitle: string;
  onOpen: () => void;
}) {
  return (
    <motion.button
      onClick={onOpen}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="group relative bg-zinc-900 hover:bg-zinc-800/80 rounded-xl border border-white/5 hover:border-violet-500/20 overflow-hidden text-left transition-all"
    >
      {/* Thumbnail / placeholder */}
      <div className="relative h-28 bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950 flex items-center justify-center overflow-hidden">
        {model.thumbnail_url ? (
          <img src={model.thumbnail_url} alt={model.title} className="w-full h-full object-cover" />
        ) : (
          <>
            {/* Grid pattern */}
            <div className="absolute inset-0 opacity-10">
              <svg width="100%" height="100%">
                <defs>
                  <pattern id={`g-${model.id}`} width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.3" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill={`url(#g-${model.id})`} />
              </svg>
            </div>
            <Box size={28} className="text-violet-400/60 group-hover:text-violet-400 group-hover:scale-110 transition-all" strokeWidth={1.2} />
          </>
        )}

        {/* Format badge */}
        {model.file_format && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30 uppercase">
            {model.file_format}
          </span>
        )}

        {/* 3D badge */}
        <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full text-[8px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          3D
        </span>
      </div>

      {/* Content */}
      <div className="p-3">
        <h4 className="text-xs font-semibold text-white mb-0.5 leading-tight truncate">{model.title}</h4>
        <p className="text-[10px] text-gray-600 truncate">{topicTitle}</p>
        {model.file_size_bytes && (
          <p className="text-[9px] text-gray-700 mt-1">{formatBytes(model.file_size_bytes)}</p>
        )}
      </div>
    </motion.button>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ══════════════════════════════════════════════
// ── Level 3: Viewer Screen ──
// ══════════════════════════════════════════════
function ViewerScreen({
  model, topic, onBack,
}: {
  model: ApiModel3D;
  topic: ApiTopic;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col h-full bg-[#0a0a12] relative overflow-hidden">
      {/* Header */}
      <div className="relative z-20 h-12 flex items-center justify-between px-5 bg-[#0a0a12]/80 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs transition-colors">
            <ChevronLeft size={14} />
            <span>Volver</span>
          </button>
          <div className="w-px h-5 bg-white/10" />
          <div>
            <h2 className="text-xs font-bold text-white">{model.title}</h2>
            <p className="text-[9px] text-gray-500">{topic.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {model.file_format && (
            <span className="px-2 py-0.5 rounded bg-violet-500/15 text-violet-300 text-[9px] font-semibold uppercase">{model.file_format}</span>
          )}
          <span className="text-[9px] text-gray-600 font-medium hidden sm:block">Arrastra para rotar &middot; Scroll para zoom</span>
        </div>
      </div>

      {/* 3D Viewport */}
      <div className="flex-1 relative z-10">
        <ModelViewer3D
          fileUrl={model.file_url}
          modelName={model.title}
          modelId={model.id}
        />
      </div>
    </div>
  );
}