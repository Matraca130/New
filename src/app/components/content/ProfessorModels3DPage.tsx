// ============================================================
// Axon — Professor 3D Models Management
//
// CRUD: create/edit/delete models per topic
// Pin editor: place/edit/delete pins on models
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ModelViewer3D } from '@/app/components/content/ModelViewer3D';
import {
  Box, Plus, Pencil, Trash2, Save, X, ChevronLeft, ChevronRight,
  Loader2, AlertCircle, MapPin, Eye, Layers, FolderOpen,
  Link2, FileType, ChevronDown, Palette,
} from 'lucide-react';
import clsx from 'clsx';
import * as api from '@/app/services/model3dApi';
import type {
  ApiCourse, ApiSemester, ApiSection, ApiTopic, ApiModel3D, ApiModel3DPin,
} from '@/app/services/model3dApi';
import { useAuth } from '@/app/context/AuthContext';

// ── View states ──
type PageView = 'hierarchy' | 'models' | 'viewer' | 'pin-editor';

// ── Pin colors ──
const PIN_COLORS = [
  '#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#f472b6',
  '#ef4444', '#f97316', '#06b6d4', '#8b5cf6', '#ec4899',
];

export function ProfessorModels3DPage() {
  const { activeMembership } = useAuth();
  const instId = activeMembership?.institution_id ?? '';

  const [view, setView] = useState<PageView>('hierarchy');

  // Hierarchy
  const [courses, setCourses] = useState<ApiCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<ApiCourse | null>(null);
  const [semesters, setSemesters] = useState<ApiSemester[]>([]);
  const [sections, setSections] = useState<Record<string, ApiSection[]>>({});
  const [topics, setTopics] = useState<Record<string, ApiTopic[]>>({});
  const [selectedTopic, setSelectedTopic] = useState<ApiTopic | null>(null);

  // Models
  const [models, setModels] = useState<ApiModel3D[]>([]);
  const [selectedModel, setSelectedModel] = useState<ApiModel3D | null>(null);

  // Pins
  const [pins, setPins] = useState<ApiModel3DPin[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModelForm, setShowModelForm] = useState(false);
  const [editingModel, setEditingModel] = useState<ApiModel3D | null>(null);
  const [showPinForm, setShowPinForm] = useState(false);
  const [editingPin, setEditingPin] = useState<ApiModel3DPin | null>(null);
  const [pendingPinPosition, setPendingPinPosition] = useState<{ x: number; y: number; z: number } | null>(null);
  const [pendingPinNormal, setPendingPinNormal] = useState<{ x: number; y: number; z: number } | undefined>();

  // Model form fields
  const [formTitle, setFormTitle] = useState('');
  const [formFileUrl, setFormFileUrl] = useState('');
  const [formFormat, setFormFormat] = useState('');
  const [formThumbnail, setFormThumbnail] = useState('');

  // Pin form fields
  const [pinLabel, setPinLabel] = useState('');
  const [pinDescription, setPinDescription] = useState('');
  const [pinColor, setPinColor] = useState(PIN_COLORS[0]);
  const [pinType, setPinType] = useState('annotation');

  // ── Load courses ──
  useEffect(() => {
    if (!instId) return;
    (async () => {
      try {
        const res = await api.fetchCourses(instId);
        setCourses(res.items || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [instId]);

  // ── Load semesters when course selected ──
  const selectCourse = async (course: ApiCourse) => {
    setSelectedCourse(course);
    try {
      const res = await api.fetchSemesters(instId, course.id);
      setSemesters(res.items || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ── Load sections for a semester ──
  const loadSections = async (semesterId: string) => {
    if (sections[semesterId]) return;
    try {
      const res = await api.fetchSections(instId, semesterId);
      setSections(prev => ({ ...prev, [semesterId]: res.items || [] }));
    } catch (err: any) {
      console.error(err);
    }
  };

  // ── Load topics for a section ──
  const loadTopics = async (sectionId: string) => {
    if (topics[sectionId]) return;
    try {
      const res = await api.fetchTopics(instId, sectionId);
      setTopics(prev => ({ ...prev, [sectionId]: res.items || [] }));
    } catch (err: any) {
      console.error(err);
    }
  };

  // ── Select topic → load models ──
  const selectTopic = async (topic: ApiTopic) => {
    setSelectedTopic(topic);
    setView('models');
    try {
      const res = await api.fetchModels3D(instId, topic.id);
      setModels(res.items || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ── Model CRUD ──
  const openCreateModel = () => {
    setEditingModel(null);
    setFormTitle('');
    setFormFileUrl('');
    setFormFormat('glb');
    setFormThumbnail('');
    setShowModelForm(true);
  };

  const openEditModel = (m: ApiModel3D) => {
    setEditingModel(m);
    setFormTitle(m.title);
    setFormFileUrl(m.file_url);
    setFormFormat(m.file_format || '');
    setFormThumbnail(m.thumbnail_url || '');
    setShowModelForm(true);
  };

  const saveModel = async () => {
    if (!selectedTopic || !formTitle.trim() || !formFileUrl.trim()) return;
    setSaving(true);
    try {
      if (editingModel) {
        const updated = await api.updateModel3D(instId, editingModel.id, {
          title: formTitle.trim(),
          file_url: formFileUrl.trim(),
          file_format: formFormat || undefined,
          thumbnail_url: formThumbnail || undefined,
        });
        setModels(prev => prev.map(m => m.id === updated.id ? updated : m));
      } else {
        const created = await api.createModel3D(instId, {
          topic_id: selectedTopic.id,
          title: formTitle.trim(),
          file_url: formFileUrl.trim(),
          file_format: formFormat || undefined,
          thumbnail_url: formThumbnail || undefined,
        });
        setModels(prev => [...prev, created]);
      }
      setShowModelForm(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteModel = async (id: string) => {
    if (!confirm('Eliminar este modelo 3D?')) return;
    try {
      await api.deleteModel3D(instId, id);
      setModels(prev => prev.filter(m => m.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ── Open pin editor ──
  const openPinEditor = async (model: ApiModel3D) => {
    setSelectedModel(model);
    setView('pin-editor');
    try {
      const res = await api.fetchPins(instId, model.id);
      setPins(res.items || []);
    } catch (err: any) {
      console.error(err);
    }
  };

  // ── Open viewer (read-only preview) ──
  const openViewer = (model: ApiModel3D) => {
    setSelectedModel(model);
    setView('viewer');
  };

  // ── Pin CRUD ──
  const handlePinPlaced = (pos: { x: number; y: number; z: number }, normal?: { x: number; y: number; z: number }) => {
    setPendingPinPosition(pos);
    setPendingPinNormal(normal);
    setPinLabel('');
    setPinDescription('');
    setPinColor(PIN_COLORS[Math.floor(Math.random() * PIN_COLORS.length)]);
    setPinType('annotation');
    setEditingPin(null);
    setShowPinForm(true);
  };

  const savePin = async () => {
    if (!selectedModel) return;
    setSaving(true);
    try {
      if (editingPin) {
        const updated = await api.updatePin(instId, editingPin.id, {
          label: pinLabel.trim() || undefined,
          description: pinDescription.trim() || undefined,
          color: pinColor,
          pin_type: pinType,
        });
        setPins(prev => prev.map(p => p.id === updated.id ? updated : p));
      } else if (pendingPinPosition) {
        const created = await api.createPin(instId, {
          model_id: selectedModel.id,
          geometry: pendingPinPosition,
          normal: pendingPinNormal,
          label: pinLabel.trim() || undefined,
          description: pinDescription.trim() || undefined,
          color: pinColor,
          pin_type: pinType,
        });
        setPins(prev => [...prev, created]);
      }
      setShowPinForm(false);
      setPendingPinPosition(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const editPin = (pin: ApiModel3DPin) => {
    setEditingPin(pin);
    setPinLabel(pin.label || '');
    setPinDescription(pin.description || '');
    setPinColor(pin.color || PIN_COLORS[0]);
    setPinType(pin.pin_type || 'annotation');
    setShowPinForm(true);
  };

  const removePin = async (pinId: string) => {
    try {
      await api.deletePin(instId, pinId);
      setPins(prev => prev.filter(p => p.id !== pinId));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const goBack = () => {
    if (view === 'pin-editor' || view === 'viewer') {
      setView('models');
      setSelectedModel(null);
      setPins([]);
    } else if (view === 'models') {
      setView('hierarchy');
      setSelectedTopic(null);
      setModels([]);
    }
  };

  // ═══════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════
  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white overflow-hidden">
      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 backdrop-blur-sm"
          >
            <AlertCircle size={14} />
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-white"><X size={12} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hierarchy browser ── */}
      {view === 'hierarchy' && (
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-white/5">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
                <Box size={18} className="text-violet-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Gestionar Modelos 3D</h1>
                <p className="text-xs text-gray-500">Selecciona un topico para gestionar sus modelos</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="text-violet-400 animate-spin" />
              </div>
            ) : (
              <>
                {/* Course selector */}
                <div className="space-y-2">
                  <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider">Curso</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {courses.map(c => (
                      <button
                        key={c.id}
                        onClick={() => selectCourse(c)}
                        className={clsx(
                          "px-4 py-3 rounded-lg border text-left text-sm transition-all",
                          selectedCourse?.id === c.id
                            ? "bg-violet-500/15 border-violet-500/30 text-violet-300"
                            : "bg-zinc-900 border-white/5 text-gray-400 hover:border-white/15 hover:text-white"
                        )}
                      >
                        {c.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Semesters → Sections → Topics tree */}
                {selectedCourse && semesters.length > 0 && (
                  <div className="space-y-2">
                    {semesters.map(sem => (
                      <SemesterAccordion
                        key={sem.id}
                        semester={sem}
                        sections={sections[sem.id] || []}
                        topics={topics}
                        onLoadSections={() => loadSections(sem.id)}
                        onLoadTopics={loadTopics}
                        onSelectTopic={selectTopic}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Models list ── */}
      {view === 'models' && selectedTopic && (
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 pt-5 pb-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={goBack} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all">
                <ChevronLeft size={16} />
              </button>
              <div>
                <h2 className="font-semibold text-white">{selectedTopic.title}</h2>
                <p className="text-[10px] text-gray-600">{models.length} modelo{models.length !== 1 ? 's' : ''} 3D</p>
              </div>
            </div>
            <button onClick={openCreateModel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-semibold hover:bg-violet-500/30 transition-all">
              <Plus size={14} />
              Nuevo Modelo
            </button>
          </div>

          <div className="p-6">
            {models.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Box size={32} className="text-gray-700 mb-3" />
                <p className="text-sm text-gray-500 mb-3">Ningun modelo 3D en este topico</p>
                <button onClick={openCreateModel} className="text-xs text-violet-400 hover:underline">
                  Crear primer modelo
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {models.map(m => (
                  <div key={m.id} className="flex items-center gap-4 bg-zinc-900 rounded-xl border border-white/5 p-4 group hover:border-white/10 transition-all">
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                      {m.thumbnail_url ? (
                        <img src={m.thumbnail_url} alt={m.title} className="w-full h-full object-cover" />
                      ) : (
                        <Box size={24} className="text-gray-700" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white text-sm truncate">{m.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        {m.file_format && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-white/5 text-gray-500 uppercase">{m.file_format}</span>
                        )}
                        <span className={clsx("px-1.5 py-0.5 rounded text-[9px]", m.is_active ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400")}>
                          {m.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                        {m.file_size_bytes && (
                          <span className="text-[9px] text-gray-600">{formatBytes(m.file_size_bytes)}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openViewer(m)} className="p-2 rounded-lg text-gray-600 hover:text-violet-400 hover:bg-white/5 transition-all" title="Visualizar">
                        <Eye size={15} />
                      </button>
                      <button onClick={() => openPinEditor(m)} className="p-2 rounded-lg text-gray-600 hover:text-amber-400 hover:bg-white/5 transition-all" title="Editar pins">
                        <MapPin size={15} />
                      </button>
                      <button onClick={() => openEditModel(m)} className="p-2 rounded-lg text-gray-600 hover:text-blue-400 hover:bg-white/5 transition-all" title="Editar">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => deleteModel(m.id)} className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-white/5 transition-all" title="Eliminar">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Viewer (preview) ── */}
      {view === 'viewer' && selectedModel && (
        <div className="flex flex-col h-full">
          <div className="h-12 flex items-center px-5 border-b border-white/10 shrink-0">
            <button onClick={goBack} className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs transition-colors">
              <ChevronLeft size={14} /> Volver
            </button>
            <div className="w-px h-5 bg-white/10 mx-3" />
            <h2 className="text-xs font-bold text-white">{selectedModel.title}</h2>
            <span className="ml-2 text-[9px] text-gray-600">Vista previa</span>
          </div>
          <div className="flex-1">
            <ModelViewer3D
              fileUrl={selectedModel.file_url}
              modelName={selectedModel.title}
              modelId={selectedModel.id}
            />
          </div>
        </div>
      )}

      {/* ── Pin Editor ── */}
      {view === 'pin-editor' && selectedModel && (
        <div className="flex h-full">
          {/* 3D viewport (left) */}
          <div className="flex-1 flex flex-col">
            <div className="h-12 flex items-center px-5 border-b border-white/10 shrink-0">
              <button onClick={goBack} className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs transition-colors">
                <ChevronLeft size={14} /> Volver
              </button>
              <div className="w-px h-5 bg-white/10 mx-3" />
              <MapPin size={14} className="text-amber-400 mr-1.5" />
              <h2 className="text-xs font-bold text-white">{selectedModel.title}</h2>
              <span className="ml-2 text-[9px] text-amber-400/70">Editor de Pins</span>
            </div>
            <div className="flex-1">
              <ModelViewer3D
                fileUrl={selectedModel.file_url}
                modelName={selectedModel.title}
                modelId={selectedModel.id}
                editMode
                onPinPlaced={handlePinPlaced}
              />
            </div>
          </div>

          {/* Pin list sidebar (right) */}
          <div className="w-80 border-l border-white/10 flex flex-col bg-zinc-900/50 shrink-0">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Pins ({pins.length})</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {pins.length === 0 && (
                <p className="text-[11px] text-gray-600 text-center py-8">
                  Doble clic en el modelo para agregar pins
                </p>
              )}
              {pins.map(pin => (
                <div key={pin.id} className="bg-zinc-900 rounded-lg border border-white/5 p-3 group">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: pin.color || '#a78bfa' }} />
                    <span className="text-xs font-semibold text-white flex-1 truncate">{pin.label || 'Pin sin nombre'}</span>
                    <button onClick={() => editPin(pin)} className="p-1 rounded text-gray-600 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all">
                      <Pencil size={11} />
                    </button>
                    <button onClick={() => removePin(pin.id)} className="p-1 rounded text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={11} />
                    </button>
                  </div>
                  {pin.description && <p className="text-[10px] text-gray-500 ml-5">{pin.description}</p>}
                  <div className="flex items-center gap-2 mt-1.5 ml-5">
                    <span className="text-[8px] text-gray-700 uppercase">{pin.pin_type || 'annotation'}</span>
                    <span className="text-[8px] text-gray-700">
                      ({pin.geometry.x.toFixed(1)}, {pin.geometry.y.toFixed(1)}, {pin.geometry.z.toFixed(1)})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Model Form Modal ── */}
      <AnimatePresence>
        {showModelForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModelForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-zinc-900 rounded-xl border border-white/10 shadow-2xl"
            >
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-semibold text-white text-sm">{editingModel ? 'Editar Modelo' : 'Nuevo Modelo 3D'}</h3>
                <button onClick={() => setShowModelForm(false)} className="p-1 rounded text-gray-500 hover:text-white"><X size={16} /></button>
              </div>
              <div className="p-5 space-y-4">
                <FormField label="Título" required>
                  <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Ej: Articulacion del Hombro" className="form-input" />
                </FormField>
                <FormField label="URL del Archivo 3D" required icon={<Link2 size={13} />}>
                  <input value={formFileUrl} onChange={e => setFormFileUrl(e.target.value)} placeholder="https://storage.example.com/model.glb" className="form-input" />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Formato" icon={<FileType size={13} />}>
                    <select value={formFormat} onChange={e => setFormFormat(e.target.value)} className="form-input">
                      <option value="">Auto</option>
                      <option value="glb">GLB</option>
                      <option value="gltf">GLTF</option>
                      <option value="obj">OBJ</option>
                      <option value="fbx">FBX</option>
                    </select>
                  </FormField>
                  <FormField label="Thumbnail URL">
                    <input value={formThumbnail} onChange={e => setFormThumbnail(e.target.value)} placeholder="https://..." className="form-input" />
                  </FormField>
                </div>
              </div>
              <div className="px-5 py-3 border-t border-white/5 flex items-center justify-end gap-2">
                <button onClick={() => setShowModelForm(false)} className="px-4 py-2 rounded-lg text-xs text-gray-400 hover:text-white transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={saveModel}
                  disabled={saving || !formTitle.trim() || !formFileUrl.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-500 text-white text-xs font-semibold hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  {editingModel ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Pin Form Modal ── */}
      <AnimatePresence>
        {showPinForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => { setShowPinForm(false); setPendingPinPosition(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-zinc-900 rounded-xl border border-white/10 shadow-2xl"
            >
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                  <MapPin size={14} className="text-amber-400" />
                  {editingPin ? 'Editar Pin' : 'Nuevo Pin'}
                </h3>
                <button onClick={() => { setShowPinForm(false); setPendingPinPosition(null); }} className="p-1 rounded text-gray-500 hover:text-white"><X size={16} /></button>
              </div>
              <div className="p-5 space-y-4">
                <FormField label="Label">
                  <input value={pinLabel} onChange={e => setPinLabel(e.target.value)} placeholder="Ej: Cabeza del Humero" className="form-input" />
                </FormField>
                <FormField label="Descripción">
                  <textarea value={pinDescription} onChange={e => setPinDescription(e.target.value)} placeholder="Descripcion del punto anatomico..." rows={3} className="form-input resize-none" />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Tipo">
                    <select value={pinType} onChange={e => setPinType(e.target.value)} className="form-input">
                      <option value="annotation">Anotacion</option>
                      <option value="label">Etiqueta</option>
                      <option value="link">Link</option>
                    </select>
                  </FormField>
                  <FormField label="Color" icon={<Palette size={13} />}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {PIN_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setPinColor(c)}
                          className={clsx(
                            "w-5 h-5 rounded-full border-2 transition-all",
                            pinColor === c ? "border-white scale-110" : "border-transparent hover:border-white/30"
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </FormField>
                </div>
                {pendingPinPosition && (
                  <div className="text-[10px] text-gray-600">
                    Posición: ({pendingPinPosition.x.toFixed(2)}, {pendingPinPosition.y.toFixed(2)}, {pendingPinPosition.z.toFixed(2)})
                  </div>
                )}
              </div>
              <div className="px-5 py-3 border-t border-white/5 flex items-center justify-end gap-2">
                <button onClick={() => { setShowPinForm(false); setPendingPinPosition(null); }} className="px-4 py-2 rounded-lg text-xs text-gray-400 hover:text-white transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={savePin}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-black text-xs font-semibold hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  {editingPin ? 'Guardar' : 'Crear Pin'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global styles for form inputs */}
      <style>{`
        .form-input {
          width: 100%;
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.03);
          color: white;
          font-size: 13px;
          outline: none;
          transition: border-color 0.15s;
        }
        .form-input:focus {
          border-color: rgba(139,92,246,0.5);
        }
        .form-input::placeholder {
          color: rgba(255,255,255,0.2);
        }
        .form-input option {
          background: #1a1a2e;
          color: white;
        }
      `}</style>
    </div>
  );
}

// ── Form field wrapper ──
function FormField({ label, required, icon, children }: {
  label: string;
  required?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
        {icon}
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

// ── Semester accordion ──
function SemesterAccordion({
  semester, sections: secs, topics: allTopics,
  onLoadSections, onLoadTopics, onSelectTopic,
}: {
  semester: ApiSemester;
  sections: ApiSection[];
  topics: Record<string, ApiTopic[]>;
  onLoadSections: () => void;
  onLoadTopics: (sectionId: string) => void;
  onSelectTopic: (t: ApiTopic) => void;
}) {
  const [open, setOpen] = useState(false);

  const toggle = () => {
    if (!open) onLoadSections();
    setOpen(!open);
  };

  return (
    <div className="bg-zinc-900 rounded-lg border border-white/5">
      <button onClick={toggle} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <Layers size={14} className="text-violet-400" />
        <span className="flex-1 text-sm text-white">{semester.title}</span>
        <ChevronDown size={14} className={clsx("text-gray-600 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-1">
          {secs.length === 0 && <p className="text-[11px] text-gray-700 py-2 pl-7">Cargando secciones...</p>}
          {secs.map(sec => (
            <SectionAccordion key={sec.id} section={sec} topics={allTopics[sec.id] || []} onLoad={() => onLoadTopics(sec.id)} onSelectTopic={onSelectTopic} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Section accordion ──
function SectionAccordion({
  section, topics: tpcs, onLoad, onSelectTopic,
}: {
  section: ApiSection;
  topics: ApiTopic[];
  onLoad: () => void;
  onSelectTopic: (t: ApiTopic) => void;
}) {
  const [open, setOpen] = useState(false);

  const toggle = () => {
    if (!open) onLoad();
    setOpen(!open);
  };

  return (
    <div className="ml-5">
      <button onClick={toggle} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/[0.03] text-left transition-all">
        <FolderOpen size={13} className="text-gray-500" />
        <span className="flex-1 text-xs text-gray-300">{section.title}</span>
        <ChevronDown size={12} className={clsx("text-gray-700 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="ml-5 space-y-0.5 py-1">
          {tpcs.length === 0 && <p className="text-[10px] text-gray-700 py-1 pl-5">Cargando topicos...</p>}
          {tpcs.map(t => (
            <button
              key={t.id}
              onClick={() => onSelectTopic(t)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-violet-500/10 text-left transition-all group"
            >
              <Box size={12} className="text-gray-600 group-hover:text-violet-400" />
              <span className="text-[11px] text-gray-400 group-hover:text-white flex-1">{t.title}</span>
              <ChevronRight size={11} className="text-gray-700 group-hover:text-violet-400" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}