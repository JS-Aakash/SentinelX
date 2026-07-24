'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import {
  X, RotateCcw, Maximize, Minimize, Eye, Box, Sun,
  Loader2, Cpu, Activity, Flame, ShieldAlert, Layers, Play, Tag,
  Clock, CheckCircle2, RefreshCw, Layers3, Move3d, Sparkles,
} from 'lucide-react';
import { DigitalTwin } from '@/types';

interface DigitalTwinViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  machineName: string;
  machineCode: string;
  digitalTwin: DigitalTwin;
}

export function DigitalTwinViewerModal({
  isOpen,
  onClose,
  machineName,
  machineCode,
  digitalTwin,
}: DigitalTwinViewerModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Viewer State
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Controls State
  const [isWireframe, setIsWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [bgStyle, setBgStyle] = useState<'dark' | 'slate' | 'deep' | 'gradient' | 'studio'>('dark');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Future Ready Feature Placeholders State (Prepared Architecture)
  const [showSensorOverlay, setShowSensorOverlay] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showVibrationHotspots, setShowVibrationHotspots] = useState(false);
  const [showFaultHighlighting, setShowFaultHighlighting] = useState(false);
  const [showPredictiveMarkers, setShowPredictiveMarkers] = useState(false);
  const [showRULVisualization, setShowRULVisualization] = useState(false);
  const [showMaintenanceAnimation, setShowMaintenanceAnimation] = useState(false);
  const [showComponentLabels, setShowComponentLabels] = useState(false);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const initialCamPosRef = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 2, z: 5 });

  // Compute Full Model URL
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
  const BACKEND_ORIGIN = API_BASE.replace('/api/v1', '');
  const modelUrl = digitalTwin.modelUrl
    ? digitalTwin.modelUrl.startsWith('http')
      ? digitalTwin.modelUrl
      : `${BACKEND_ORIGIN}${digitalTwin.modelUrl}`
    : '';

  // Background color map
  const bgColors: Record<string, number> = {
    dark: 0x0a0b10,
    slate: 0x1e293b,
    deep: 0x030712,
    gradient: 0x0f172a,
    studio: 0x334155,
  };

  // Reset Camera Position
  const handleResetCamera = useCallback(() => {
    if (cameraRef.current && controlsRef.current && initialCamPosRef.current) {
      const { x, y, z } = initialCamPosRef.current;
      cameraRef.current.position.set(x, y, z);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, []);

  // Toggle Wireframe Mode
  const handleToggleWireframe = useCallback(() => {
    setIsWireframe((prev) => {
      const next = !prev;
      if (modelGroupRef.current) {
        modelGroupRef.current.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((mat: any) => { if ('wireframe' in mat) mat.wireframe = next; });
            } else if (mesh.material && 'wireframe' in mesh.material) {
              (mesh.material as any).wireframe = next;
            }
          }
        });
      }
      return next;
    });
  }, []);

  // Toggle Auto Rotate
  const handleToggleAutoRotate = useCallback(() => {
    setAutoRotate((prev) => {
      const next = !prev;
      if (controlsRef.current) {
        controlsRef.current.autoRotate = next;
      }
      return next;
    });
  }, []);

  // Keyboard ESC listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Toggle Fullscreen
  const handleToggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // Initialize Three.js Scene
  useEffect(() => {
    if (!isOpen || !canvasContainerRef.current || !canvasRef.current || !modelUrl) return;

    setLoading(true);
    setProgress(0);
    setError(null);

    const container = canvasContainerRef.current;
    const canvas = canvasRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bgColors[bgStyle]);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(3, 3, 5);
    cameraRef.current = camera;

    // 3. Renderer attached directly to canvas
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.1;
    controls.minDistance = 0.5;
    controls.maxDistance = 50;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 2.0;
    controlsRef.current = controls;

    // 5. Natural External Studio Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x222233, 1.0);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    // Main External Key Light (Top-Right-Front)
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(12, 18, 12);
    keyLight.castShadow = true;
    scene.add(keyLight);

    // Soft External Fill Light (Back-Left)
    const fillLight = new THREE.DirectionalLight(0xffffff, 1.0);
    fillLight.position.set(-12, 8, -10);
    scene.add(fillLight);

    // 6. Grid Helper & Axis Helper
    const gridHelper = new THREE.GridHelper(20, 20, 0x3b82f6, 0x1b1d2a);
    gridHelper.position.y = 0;
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;

    // 7. Group for Model
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    // 8. Load Model based on Format
    const format = (digitalTwin.modelFormat || '').toLowerCase();
    const onProgress = (xhr: ProgressEvent) => {
      if (xhr.lengthComputable) {
        const percent = Math.round((xhr.loaded / xhr.total) * 100);
        setProgress(percent);
      } else {
        setProgress(50);
      }
    };

    const onModelLoaded = (object: THREE.Object3D) => {
      modelGroup.add(object);

      // Center and scale model to fit view bounding box
      const box = new THREE.Box3().setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const scale = 3.5 / maxDim;

      object.scale.setScalar(scale);

      // Re-center
      box.setFromObject(object);
      box.getCenter(center);
      object.position.sub(center);
      object.position.y += (size.y * scale) / 2;

      // Adjust camera
      camera.position.set(0, (size.y * scale) / 2 + 1, (size.z * scale) + 4);
      initialCamPosRef.current = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
      controls.target.set(0, (size.y * scale) / 2, 0);
      controls.update();

      setLoading(false);
    };

    const onError = (err: any) => {
      console.error('[DigitalTwinViewer] Error loading 3D model:', err);
      setError('Failed to load 3D model. Please check file format and URL.');
      setLoading(false);
    };

    if (format === 'glb' || format === 'gltf') {
      const loader = new GLTFLoader();
      loader.load(modelUrl, (gltf) => onModelLoaded(gltf.scene), onProgress, onError);
    } else if (format === 'obj') {
      const loader = new OBJLoader();
      loader.load(modelUrl, (obj) => onModelLoaded(obj), onProgress, onError);
    } else if (format === 'fbx') {
      const loader = new FBXLoader();
      loader.load(modelUrl, (fbx) => onModelLoaded(fbx), onProgress, onError);
    } else {
      // Default try GLTF
      const loader = new GLTFLoader();
      loader.load(modelUrl, (gltf) => onModelLoaded(gltf.scene), onProgress, onError);
    }

    // Animation Loop
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      if (controlsRef.current) controlsRef.current.update();
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!canvasContainerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = canvasContainerRef.current.clientWidth;
      const h = canvasContainerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (rendererRef.current) {
        if (rendererRef.current.domElement && rendererRef.current.domElement.parentNode) {
          try {
            rendererRef.current.domElement.parentNode.removeChild(rendererRef.current.domElement);
          } catch {}
        }
        rendererRef.current.dispose();
      }
    };
  }, [isOpen, modelUrl, bgStyle]);

  // Update Background Color
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(bgColors[bgStyle]);
    }
  }, [bgStyle]);

  // Update Grid Visibility
  useEffect(() => {
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = showGrid;
    }
  }, [showGrid]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        className={`relative w-full max-w-6xl h-[85vh] bg-[#0A0B10] border border-[#1B1D2A] rounded-2xl overflow-hidden shadow-2xl flex flex-col ${
          isFullscreen ? 'fixed inset-0 z-50 max-w-none h-screen rounded-none' : ''
        }`}
      >
        {/* ─── Top Bar ────────────────────────────────────────────────── */}
        <div className="h-16 bg-[#0D0F1A] border-b border-[#1B1D2A] px-6 flex items-center justify-between shrink-0 select-none z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center">
              <Move3d className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">{machineName}</h2>
                <span className="text-[10px] font-mono uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                  Digital Twin 3D
                </span>
                <span className="text-[10px] font-mono bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full">
                  v{digitalTwin.version || 1}
                </span>
              </div>
              <p className="text-xs text-[#64748B] font-mono">
                {machineCode} · Interactive 3D Studio
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleFullscreen}
              className="p-2 rounded-lg bg-[#1B1D2A] text-[#94A3B8] hover:text-white hover:bg-[#2A2D3E] transition-all"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition-all flex items-center gap-1.5 font-semibold text-xs shadow-lg"
              title="Close 3D Viewer (Esc)"
            >
              <X className="w-4 h-4" /> Close
            </button>
          </div>
        </div>

        {/* ─── 3D Canvas Area ────────────────────────────────────────── */}
        <div ref={canvasContainerRef} className="relative flex-1 bg-[#0A0B10] overflow-hidden">
          <canvas ref={canvasRef} className="w-full h-full block" />
          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-[#0A0B10]/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-3">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
                <Move3d className="w-6 h-6 text-white absolute" />
              </div>
              <p className="text-sm font-semibold text-white">Loading 3D Model ({progress}%)...</p>
              <div className="w-48 h-1.5 bg-[#1B1D2A] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="absolute inset-0 bg-[#0A0B10]/95 z-20 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <ShieldAlert className="w-12 h-12 text-red-400" />
              <p className="text-base font-bold text-white">Unable to render 3D Model</p>
              <p className="text-xs text-[#64748B] max-w-md">{error}</p>
            </div>
          )}

          {/* Floating Controls Overlay (Top Right) */}
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 bg-[#0D0F1A]/80 backdrop-blur-md border border-[#1B1D2A] p-2 rounded-xl shadow-xl">
            <button
              onClick={handleResetCamera}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-[#94A3B8] hover:text-white hover:bg-[#1B1D2A] transition-all"
              title="Reset Camera View"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" /> Reset View
            </button>
            <button
              onClick={handleToggleWireframe}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isWireframe ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-[#94A3B8] hover:text-white hover:bg-[#1B1D2A]'
              }`}
              title="Toggle Wireframe Rendering"
            >
              <Box className="w-3.5 h-3.5" /> Wireframe
            </button>
            <button
              onClick={handleToggleAutoRotate}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                autoRotate ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'text-[#94A3B8] hover:text-white hover:bg-[#1B1D2A]'
              }`}
              title="Toggle Auto Orbit Rotation"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Auto Rotate
            </button>
            <button
              onClick={() => setShowGrid((prev) => !prev)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                showGrid ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-[#94A3B8] hover:text-white hover:bg-[#1B1D2A]'
              }`}
              title="Toggle Floor Grid"
            >
              <Layers3 className="w-3.5 h-3.5" /> Floor Grid
            </button>
          </div>

          {/* Background Color Chooser (Bottom Right) */}
          <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 bg-[#0D0F1A]/80 backdrop-blur-md border border-[#1B1D2A] px-3 py-1.5 rounded-xl shadow-xl">
            <span className="text-[10px] uppercase font-mono text-[#64748B] mr-1">Theme</span>
            {(['dark', 'slate', 'deep', 'gradient', 'studio'] as const).map((theme) => (
              <button
                key={theme}
                onClick={() => setBgStyle(theme)}
                className={`w-5 h-5 rounded-full border transition-transform ${
                  bgStyle === theme ? 'scale-125 ring-2 ring-cyan-400' : 'opacity-70 hover:opacity-100'
                } ${
                  theme === 'dark' ? 'bg-[#0A0B10] border-slate-700' :
                  theme === 'slate' ? 'bg-[#1E293B] border-slate-600' :
                  theme === 'deep' ? 'bg-[#030712] border-gray-800' :
                  theme === 'gradient' ? 'bg-[#0F172A] border-indigo-700' : 'bg-[#334155] border-slate-500'
                }`}
                title={`Background Theme: ${theme}`}
              />
            ))}
          </div>
        </div>

        {/* ─── Controls Instruction Footer ───────────────────────────────── */}
        <div className="h-10 bg-[#0D0F1A] border-t border-[#1B1D2A] px-6 flex items-center justify-between shrink-0 text-xs text-[#64748B] font-mono select-none">
          <div className="flex items-center gap-4">
            <span>🖱️ Left Click + Drag: Orbit / Rotate</span>
            <span>🖱️ Right Click + Drag: Pan</span>
            <span>📜 Scroll: Zoom</span>
          </div>
          <div className="flex items-center gap-1.5 text-cyan-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive 3D Digital Twin Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}
