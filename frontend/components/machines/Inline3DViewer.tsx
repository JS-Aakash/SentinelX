'use client';

import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { Loader2, Move3d, ShieldAlert } from 'lucide-react';
import { DigitalTwin } from '@/types';

interface Inline3DViewerProps {
  digitalTwin: DigitalTwin;
  heightClass?: string;
}

export function Inline3DViewer({ digitalTwin, heightClass = 'h-48' }: Inline3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
  const BACKEND_ORIGIN = API_BASE.replace('/api/v1', '');
  const modelUrl = digitalTwin.modelUrl
    ? digitalTwin.modelUrl.startsWith('http')
      ? digitalTwin.modelUrl
      : `${BACKEND_ORIGIN}${digitalTwin.modelUrl}`
    : '';

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current || !modelUrl) return;

    setLoading(true);
    setProgress(0);
    setError(null);

    const container = containerRef.current;
    const canvas = canvasRef.current;
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 200;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0b10);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(2.5, 2.5, 4);

    // 3. Renderer using native canvas element
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.8;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2.5;

    // 5. Studio Bright Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 3.5);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444455, 2.5);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 3.5);
    dirLight1.position.set(10, 20, 15);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight2.position.set(-10, 10, -15);
    scene.add(dirLight2);

    const dirLight3 = new THREE.DirectionalLight(0x38bdf8, 1.5);
    dirLight3.position.set(0, -10, 0);
    scene.add(dirLight3);

    // 6. Grid Helper
    const grid = new THREE.GridHelper(10, 10, 0x3b82f6, 0x1b1d2a);
    grid.position.y = 0;
    scene.add(grid);

    // 7. Group
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    const format = (digitalTwin.modelFormat || '').toLowerCase();

    const onProgress = (xhr: ProgressEvent) => {
      if (xhr.lengthComputable) {
        setProgress(Math.round((xhr.loaded / xhr.total) * 100));
      } else {
        setProgress(50);
      }
    };

    const onModelLoaded = (object: THREE.Object3D) => {
      // Optimize materials for brightness
      object.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.material) {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((mat: any) => {
              if ('roughness' in mat && mat.roughness > 0.8) mat.roughness = 0.5;
              if ('metalness' in mat && mat.metalness > 0.9) mat.metalness = 0.3;
              mat.needsUpdate = true;
            });
          }
        }
      });

      modelGroup.add(object);

      const box = new THREE.Box3().setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const scale = 2.8 / maxDim;

      object.scale.setScalar(scale);
      box.setFromObject(object);
      box.getCenter(center);
      object.position.sub(center);
      object.position.y += (size.y * scale) / 2;

      camera.position.set(0, (size.y * scale) / 2 + 0.8, (size.z * scale) + 3.2);
      controls.target.set(0, (size.y * scale) / 2, 0);
      controls.update();

      setLoading(false);
    };

    const onError = (err: any) => {
      console.error('[Inline3DViewer] Error:', err);
      setError('Unable to render 3D model preview');
      setLoading(false);
    };

    if (format === 'glb' || format === 'gltf') {
      new GLTFLoader().load(modelUrl, (gltf) => onModelLoaded(gltf.scene), onProgress, onError);
    } else if (format === 'obj') {
      new OBJLoader().load(modelUrl, (obj) => onModelLoaded(obj), onProgress, onError);
    } else if (format === 'fbx') {
      new FBXLoader().load(modelUrl, (fbx) => onModelLoaded(fbx), onProgress, onError);
    } else {
      new GLTFLoader().load(modelUrl, (gltf) => onModelLoaded(gltf.scene), onProgress, onError);
    }

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      renderer.dispose();
    };
  }, [modelUrl, digitalTwin.modelFormat]);

  return (
    <div ref={containerRef} className={`relative w-full ${heightClass} rounded-xl overflow-hidden bg-[#0A0B10] border border-[#1B1D2A] group`}>
      <canvas ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing block" />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-[#0A0B10]/90 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <span className="text-xs font-mono text-white">Rendering 3D Model ({progress}%)...</span>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 bg-[#0A0B10]/90 flex flex-col items-center justify-center gap-2 text-center p-3">
          <ShieldAlert className="w-6 h-6 text-red-400" />
          <span className="text-xs text-red-400 font-mono">{error}</span>
        </div>
      )}

      {/* Subtle Hint */}
      {!loading && !error && (
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-[#94A3B8] font-mono pointer-events-none flex items-center gap-1">
          <Move3d className="w-3 h-3 text-cyan-400" /> Click & Drag to Orbit 3D
        </div>
      )}
    </div>
  );
}
