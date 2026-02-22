// ============================================================
// Axon — ModelViewer3D (THREE.js GLB/GLTF Viewer)
//
// Loads real .glb/.gltf from API file_url.
// Shows professor pins as 3D markers.
// Student can add personal notes.
// Falls back to procedural models if no file_url.
// ============================================================
import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import clsx from 'clsx';
import {
  MapPin, Trash2, X, Eye, EyeOff,
  RotateCcw, ZoomIn, ZoomOut, StickyNote, Send,
} from 'lucide-react';
import type { ApiModel3DPin, ApiModel3DNote } from '@/app/services/model3dApi';
import * as api from '@/app/services/model3dApi';
import { useAuth } from '@/app/context/AuthContext';

// ── Props ──
interface ModelViewer3DProps {
  /** URL to the .glb/.gltf file */
  fileUrl?: string;
  /** Model name for watermark */
  modelName: string;
  /** Model ID for fetching pins and notes */
  modelId?: string;
  /** Professor mode: enables pin placement */
  editMode?: boolean;
  /** Callback when a pin is placed (professor mode) */
  onPinPlaced?: (position: { x: number; y: number; z: number }, normal?: { x: number; y: number; z: number }) => void;
}

// ── Projected pin (2D screen coords) ──
interface Projected2DPin {
  pin: ApiModel3DPin;
  x: number;
  y: number;
  visible: boolean;
}

export function ModelViewer3D({ fileUrl, modelName, modelId, editMode = false, onPinPlaced }: ModelViewer3DProps) {
  const { activeMembership } = useAuth();
  const instId = activeMembership?.institution_id ?? '';

  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameRef = useRef<number>(0);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  // Stable refs for values used inside the animation loop / event handlers
  // so the scene-setup effect does NOT re-run when they change.
  const pinsRef = useRef<ApiModel3DPin[]>([]);
  const editModeRef = useRef(editMode);
  const onPinPlacedRef = useRef(onPinPlaced);

  const [pins, setPins] = useState<ApiModel3DPin[]>([]);
  const [notes, setNotes] = useState<ApiModel3DNote[]>([]);
  const [projected, setProjected] = useState<Projected2DPin[]>([]);
  const [activePin, setActivePin] = useState<string | null>(null);
  const [showPins, setShowPins] = useState(true);
  const [showNotes, setShowNotes] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Fetch pins + notes from API ──
  useEffect(() => {
    if (!modelId || !instId) return;
    (async () => {
      try {
        const [pinsRes, notesRes] = await Promise.all([
          api.fetchPins(instId, modelId),
          api.fetchNotes(instId, modelId),
        ]);
        setPins(pinsRes.items || []);
        setNotes(notesRes.items || []);
      } catch (err) {
        console.warn('[3D] Failed to fetch pins/notes:', err);
      }
    })();
  }, [modelId, instId]);

  // Keep refs in sync
  useEffect(() => { pinsRef.current = pins; }, [pins]);
  useEffect(() => { editModeRef.current = editMode; }, [editMode]);
  useEffect(() => { onPinPlacedRef.current = onPinPlaced; }, [onPinPlaced]);

  // ── Project pins to 2D screen coords ──
  const projectPins = useCallback(() => {
    const currentPins = pinsRef.current;
    if (!cameraRef.current || !containerRef.current || currentPins.length === 0) {
      setProjected([]);
      return;
    }
    const camera = cameraRef.current;
    const rect = containerRef.current.getBoundingClientRect();

    const result: Projected2DPin[] = currentPins.map(pin => {
      const vec = new THREE.Vector3(pin.geometry.x, pin.geometry.y, pin.geometry.z);
      vec.project(camera);
      return {
        pin,
        x: (vec.x * 0.5 + 0.5) * rect.width,
        y: (-vec.y * 0.5 + 0.5) * rect.height,
        visible: vec.z < 1,
      };
    });
    setProjected(result);
  }, []); // stable — reads from pinsRef

  // ── Build scene + load model ──
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    setIsLoading(true);
    setLoadError(null);
    setLoadProgress(0);

    // ── Scene ──
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a12);
    sceneRef.current = scene;

    // ── Camera ──
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.01, 200);
    camera.position.set(3, 2, 4);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ── Controls ──
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0, 0);
    controls.minDistance = 0.5;
    controls.maxDistance = 20;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controlsRef.current = controls;

    // ── Lighting ──
    const ambLight = new THREE.AmbientLight(0x606080, 1.0);
    scene.add(ambLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(5, 8, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.5);
    fillLight.position.set(-3, 2, -3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x4488ff, 0.4);
    rimLight.position.set(0, -2, -5);
    scene.add(rimLight);

    // ── Ground grid ──
    const gridHelper = new THREE.GridHelper(10, 20, 0x222244, 0x181828);
    gridHelper.position.y = -1.5;
    scene.add(gridHelper);

    // ── Load model ──
    if (fileUrl) {
      const loader = new GLTFLoader();
      loader.load(
        fileUrl,
        (gltf) => {
          const model = gltf.scene;
          // Auto-center and scale
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 3 / maxDim;
          model.scale.setScalar(scale);
          model.position.sub(center.multiplyScalar(scale));
          scene.add(model);
          // Adjust camera
          controls.target.set(0, 0, 0);
          camera.position.set(maxDim * scale * 1.5, maxDim * scale, maxDim * scale * 1.5);
          controls.update();
          setIsLoading(false);
        },
        (xhr) => {
          if (xhr.total > 0) {
            setLoadProgress(Math.round((xhr.loaded / xhr.total) * 100));
          }
        },
        (err) => {
          console.error('[3D] Load error:', err);
          setLoadError('Error al cargar el modelo 3D');
          buildFallbackModel(scene);
          setIsLoading(false);
        }
      );
    } else {
      // No file_url — build procedural fallback
      buildFallbackModel(scene);
      setIsLoading(false);
    }

    // ── Animation loop ──
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
      projectPins();
    };
    animate();

    // ── Resize ──
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // ── Click handler (for pin placement in edit mode) ──
    const handleClick = (event: MouseEvent) => {
      if (!editModeRef.current || !onPinPlacedRef.current || !sceneRef.current) return;
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const meshes: THREE.Mesh[] = [];
      sceneRef.current.traverse((obj) => { if (obj instanceof THREE.Mesh) meshes.push(obj); });
      const intersects = raycasterRef.current.intersectObjects(meshes, false);
      if (intersects.length > 0) {
        const hit = intersects[0];
        const pos = hit.point;
        const norm = hit.face?.normal;
        onPinPlacedRef.current(
          { x: pos.x, y: pos.y, z: pos.z },
          norm ? { x: norm.x, y: norm.y, z: norm.z } : undefined
        );
      }
    };
    renderer.domElement.addEventListener('dblclick', handleClick);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('dblclick', handleClick);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
    };
  }, [fileUrl, projectPins]); // only rebuild scene when URL changes; projectPins is stable

  // ── Add note ──
  const handleAddNote = async () => {
    if (!modelId || !newNote.trim() || !instId) return;
    try {
      const created = await api.createNote(instId, { model_id: modelId, note: newNote.trim() });
      setNotes(prev => [...prev, created]);
      setNewNote('');
    } catch (err) {
      console.error('[3D] Failed to create note:', err);
    }
  };

  // ── Delete note ──
  const handleDeleteNote = async (noteId: string) => {
    if (!instId) return;
    try {
      await api.deleteNote(instId, noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err) {
      console.error('[3D] Failed to delete note:', err);
    }
  };

  // ── Camera controls ──
  const resetCamera = () => {
    if (controlsRef.current && cameraRef.current) {
      cameraRef.current.position.set(3, 2, 4);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  const zoomIn = () => {
    if (controlsRef.current) {
      const dir = new THREE.Vector3();
      cameraRef.current?.getWorldDirection(dir);
      cameraRef.current?.position.addScaledVector(dir, 0.5);
    }
  };

  const zoomOut = () => {
    if (controlsRef.current) {
      const dir = new THREE.Vector3();
      cameraRef.current?.getWorldDirection(dir);
      cameraRef.current?.position.addScaledVector(dir, -0.5);
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Three.js canvas */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0a0a12]/90 backdrop-blur-sm">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
            <div
              className="absolute inset-0 rounded-full border-2 border-violet-500 border-t-transparent animate-spin"
            />
          </div>
          <p className="text-sm text-violet-300">Cargando modelo...</p>
          {loadProgress > 0 && loadProgress < 100 && (
            <div className="mt-2 w-32 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${loadProgress}%` }} />
            </div>
          )}
        </div>
      )}

      {/* Error overlay */}
      {loadError && !isLoading && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-xs backdrop-blur-sm">
          {loadError} — mostrando modelo generico
        </div>
      )}

      {/* Top controls bar */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5">
        {/* Toggle pins */}
        <button
          onClick={() => setShowPins(!showPins)}
          className={clsx(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all backdrop-blur-sm border",
            showPins
              ? "bg-violet-500/20 text-violet-300 border-violet-500/30"
              : "bg-white/5 text-gray-500 border-white/10 hover:bg-white/10"
          )}
        >
          {showPins ? <Eye size={12} /> : <EyeOff size={12} />}
          Pins ({pins.length})
        </button>

        {/* Toggle notes panel */}
        {!editMode && modelId && (
          <button
            onClick={() => setShowNotes(!showNotes)}
            className={clsx(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all backdrop-blur-sm border",
              showNotes
                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                : "bg-white/5 text-gray-500 border-white/10 hover:bg-white/10"
            )}
          >
            <StickyNote size={12} />
            Notas ({notes.length})
          </button>
        )}
      </div>

      {/* Camera controls (right side) */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1">
        <button onClick={resetCamera} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all backdrop-blur-sm" title="Resetear cámara">
          <RotateCcw size={14} />
        </button>
        <button onClick={zoomIn} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all backdrop-blur-sm" title="Zoom in">
          <ZoomIn size={14} />
        </button>
        <button onClick={zoomOut} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all backdrop-blur-sm" title="Zoom out">
          <ZoomOut size={14} />
        </button>
      </div>

      {/* Pin markers (2D overlay) */}
      {showPins && projected.map(({ pin, x, y, visible }) => (
        visible && (
          <div
            key={pin.id}
            className="absolute z-10 pointer-events-auto"
            style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
          >
            {/* Ping */}
            <div
              className="absolute rounded-full animate-ping opacity-25"
              style={{
                backgroundColor: pin.color || '#a78bfa',
                width: 14, height: 14, left: -7, top: -7,
              }}
            />
            {/* Dot */}
            <button
              onClick={() => setActivePin(activePin === pin.id ? null : pin.id)}
              className="relative w-3.5 h-3.5 rounded-full border-2 border-white/80 shadow-lg cursor-pointer hover:scale-150 transition-transform"
              style={{ backgroundColor: pin.color || '#a78bfa' }}
            />
            {/* Tooltip */}
            {activePin === pin.id && (
              <div
                className="absolute left-5 top-1/2 -translate-y-1/2 bg-black/90 backdrop-blur-xl rounded-lg border border-white/15 p-3 min-w-[200px] max-w-[260px] shadow-2xl z-30"
                style={{ borderLeftColor: pin.color || '#a78bfa', borderLeftWidth: 3 }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pin.color || '#a78bfa' }} />
                  <h4 className="text-xs font-bold text-white">{pin.label || 'Pin'}</h4>
                  {pin.pin_type && (
                    <span className="px-1.5 py-0.5 rounded text-[8px] bg-white/10 text-gray-400 uppercase">{pin.pin_type}</span>
                  )}
                </div>
                {pin.description && (
                  <p className="text-[10px] text-gray-400 leading-relaxed">{pin.description}</p>
                )}
              </div>
            )}
          </div>
        )
      ))}

      {/* Edit mode indicator */}
      {editMode && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold backdrop-blur-sm">
          <MapPin size={12} className="inline mr-1.5" />
          Doble clic en el modelo para colocar un pin
        </div>
      )}

      {/* Notes panel (student side) */}
      {showNotes && !editMode && modelId && (
        <div className="absolute top-12 right-3 z-20 w-72 max-h-[calc(100%-6rem)] bg-[#13131d]/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <StickyNote size={14} className="text-indigo-400" />
              <span className="text-xs font-semibold text-white">Mis Notas</span>
            </div>
            <button onClick={() => setShowNotes(false)} className="p-1 rounded text-gray-500 hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>

          {/* Notes list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {notes.length === 0 && (
              <p className="text-[11px] text-gray-600 text-center py-4">Aun no hay notas. Agrega una abajo!</p>
            )}
            {notes.map(note => (
              <div key={note.id} className="bg-white/5 rounded-lg p-3 border border-white/5 group">
                <p className="text-[11px] text-gray-300 leading-relaxed">{note.note}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[9px] text-gray-600">
                    {new Date(note.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                  </span>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-red-400/60 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add note input */}
          <div className="px-3 pb-3 pt-1 border-t border-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                placeholder="Escribe una nota..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50"
              />
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <Send size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Model name watermark */}
      <div className="absolute bottom-3 left-3 z-10">
        <p className="text-[9px] text-gray-600 font-medium uppercase tracking-widest">{modelName}</p>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-3 right-3 z-10">
        <p className="text-[9px] text-gray-700">Arrastra &middot; Scroll &middot; Pinza</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// ── Fallback procedural model (generic bone) ──
// ═════════════════════════════════════════════
function buildFallbackModel(scene: THREE.Scene) {
  const boneMat = new THREE.MeshPhysicalMaterial({
    color: 0xf5e6d3, roughness: 0.6, metalness: 0.05, clearcoat: 0.1,
  });

  const shaftPoints: THREE.Vector2[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const y = t * 4 - 2;
    const r = 0.25 + 0.15 * Math.cos(Math.PI * t);
    shaftPoints.push(new THREE.Vector2(r, y));
  }
  const shaft = new THREE.Mesh(new THREE.LatheGeometry(shaftPoints, 24), boneMat);
  scene.add(shaft);

  const prox = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 24), boneMat);
  prox.position.y = 2;
  scene.add(prox);

  const dist1 = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 20), boneMat);
  dist1.position.set(-0.2, -2, 0);
  scene.add(dist1);

  const dist2 = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 20), boneMat);
  dist2.position.set(0.2, -2, 0);
  scene.add(dist2);

  const cartMat = new THREE.MeshPhysicalMaterial({
    color: 0xb8d4e3, roughness: 0.4, transparent: true, opacity: 0.85, clearcoat: 0.5,
  });
  const cart = new THREE.Mesh(
    new THREE.SphereGeometry(0.56, 24, 24, 0, Math.PI * 2, 0, Math.PI / 3),
    cartMat
  );
  cart.position.y = 2;
  scene.add(cart);
}