import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ImplantConfig } from "../types";
import { 
  Box, 
  RotateCw, 
  Sparkles, 
  Ruler, 
  Activity, 
  CheckCircle2, 
  Calendar, 
  Cpu, 
  Maximize2,
  Sliders,
  Info,
  ShieldCheck,
  Eye,
  Layers,
  ChevronRight
} from "lucide-react";

interface Implant3DViewerProps {
  onBookAppointment: (serviceName: string, notes: string) => void;
}

const PRESET_VOLUMES = [250, 285, 300, 315, 335, 355, 380, 400];

export const Implant3DViewer: React.FC<Implant3DViewerProps> = ({ onBookAppointment }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // 3D Implant Parameters
  const [config, setConfig] = useState<ImplantConfig>({
    volumeCc: 315,
    profile: "High",
    shape: "Ergonomix",
    gelType: "ProgressiveGel",
    surface: "NanoSurface"
  });

  // Mobile active sub-tab for optimal ergonomics: "viewer" | "specs" | "ai"
  const [mobileTab, setMobileTab] = useState<"viewer" | "specs" | "ai">("viewer");

  // AR Silhouette / Grid Mode Overlay inside Canvas
  const [arOverlayMode, setArOverlayMode] = useState<"none" | "silhouette" | "grid">("silhouette");

  // AI Advisor state
  const [userBody, setUserBody] = useState({
    height: 160,
    weight: 50,
    currentBust: 80,
    shoulderWidth: 38,
    desiredLook: "natural"
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<any>(null);

  // Side-by-Side compare mode
  const [compareMode, setCompareMode] = useState(false);
  const [compareVolumeCc, setCompareVolumeCc] = useState(355);

  // View Mode: silicone gel vs wireframe 3D grid
  const [viewMode, setViewMode] = useState<"silicone" | "wireframe">("silicone");

  // Three.js scene references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const meshCompareRef = useRef<THREE.Mesh | null>(null);
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });

  // Map Profile to height scale multiplier
  const getProfileScale = (profile: string) => {
    switch (profile) {
      case "Low": return 0.75;
      case "Moderate Plus": return 0.95;
      case "High": return 1.2;
      case "Extra High": return 1.45;
      default: return 1.1;
    }
  };

  // Calculated Dimensions (cm)
  const baseDiameterCm = (Math.pow((3 * config.volumeCc) / (2 * Math.PI), 1 / 3) * 2.75).toFixed(1);
  const projectionCm = (Math.pow((3 * config.volumeCc) / (2 * Math.PI), 1 / 3) * 1.35 * getProfileScale(config.profile)).toFixed(1);

  // Volume Adjustment Steppers
  const adjustVolume = (delta: number) => {
    setConfig(prev => ({
      ...prev,
      volumeCc: Math.min(550, Math.max(200, prev.volumeCc + delta))
    }));
  };

  // Helper to create an implant mesh
  const createImplantGeometry = (volume: number, profile: string) => {
    const baseRadius = Math.pow((3 * volume) / (2 * Math.PI), 1 / 3) * 0.28;
    const heightScale = getProfileScale(profile);

    const points: THREE.Vector2[] = [];
    const segments = 32;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 0.5;
      const x = Math.cos(theta) * baseRadius;
      const y = Math.sin(theta) * baseRadius * heightScale * (1 + 0.15 * Math.cos(theta));
      points.push(new THREE.Vector2(x, y));
    }

    return new THREE.LatheGeometry(points, 48);
  };

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight || 380;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b192c);
    sceneRef.current = scene;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 7);
    cameraRef.current = camera;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // 4. Lighting for realistic silicone gel translucency
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xfdf8f6, 1.8);
    dirLight1.position.set(5, 8, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xd97706, 0.9);
    dirLight2.position.set(-5, -5, -3);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0xfef3c7, 1.2, 10);
    pointLight.position.set(0, 2, 3);
    scene.add(pointLight);

    // 5. Silicone Gel Material
    const siliconeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xfffcfa,
      transmission: 0.68,
      opacity: 0.95,
      transparent: true,
      roughness: 0.16,
      metalness: 0.05,
      ior: 1.42,
      thickness: 1.2,
      clearcoat: 0.95,
      clearcoatRoughness: 0.08,
      reflectivity: 0.85,
      wireframe: viewMode === "wireframe"
    });

    // Main Implant Mesh
    const geometry = createImplantGeometry(config.volumeCc, config.profile);
    const mesh = new THREE.Mesh(geometry, siliconeMaterial);
    mesh.rotation.x = -Math.PI * 0.1;
    scene.add(mesh);
    meshRef.current = mesh;

    // Comparison Mesh (if compare mode enabled)
    const compareMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xecfdf5,
      transmission: 0.72,
      opacity: 0.95,
      transparent: true,
      roughness: 0.15,
      ior: 1.42,
      clearcoat: 1.0,
      wireframe: viewMode === "wireframe"
    });
    const compareGeo = createImplantGeometry(compareVolumeCc, config.profile);
    const compareMesh = new THREE.Mesh(compareGeo, compareMaterial);
    compareMesh.position.set(2.2, 0, 0);
    compareMesh.rotation.x = -Math.PI * 0.1;
    compareMesh.visible = compareMode;
    scene.add(compareMesh);
    meshCompareRef.current = compareMesh;

    // Grid Floor
    const gridHelper = new THREE.GridHelper(10, 20, 0xd97706, 0x334155);
    gridHelper.position.y = -1.8;
    scene.add(gridHelper);

    // Render loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!isDraggingRef.current && meshRef.current) {
        meshRef.current.rotation.y += 0.004;
        if (meshCompareRef.current && compareMode) {
          meshCompareRef.current.rotation.y += 0.004;
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    // ResizeObserver for dynamic container resizes
    const resizeObserver = new ResizeObserver(() => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const newW = mountRef.current.clientWidth;
      const newH = mountRef.current.clientHeight || 380;
      cameraRef.current.aspect = newW / newH;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newW, newH);
    });
    resizeObserver.observe(mountRef.current);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update mesh geometry & view mode on state changes
  useEffect(() => {
    if (!meshRef.current) return;
    meshRef.current.geometry.dispose();
    meshRef.current.geometry = createImplantGeometry(config.volumeCc, config.profile);

    if (meshRef.current.material instanceof THREE.MeshPhysicalMaterial) {
      meshRef.current.material.wireframe = viewMode === "wireframe";
    }

    if (compareMode && meshCompareRef.current) {
      meshCompareRef.current.visible = true;
      meshCompareRef.current.geometry.dispose();
      meshCompareRef.current.geometry = createImplantGeometry(compareVolumeCc, config.profile);
      meshRef.current.position.set(-1.8, 0, 0);

      if (meshCompareRef.current.material instanceof THREE.MeshPhysicalMaterial) {
        meshCompareRef.current.material.wireframe = viewMode === "wireframe";
      }
    } else if (meshCompareRef.current) {
      meshCompareRef.current.visible = false;
      meshRef.current.position.set(0, 0, 0);
    }
  }, [config, compareMode, compareVolumeCc, viewMode]);

  // Mouse & Touch Interaction for 360 Rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !meshRef.current) return;
    const deltaX = e.clientX - previousMousePositionRef.current.x;
    const deltaY = e.clientY - previousMousePositionRef.current.y;

    meshRef.current.rotation.y += deltaX * 0.01;
    meshRef.current.rotation.x += deltaY * 0.01;

    if (meshCompareRef.current) {
      meshCompareRef.current.rotation.y += deltaX * 0.01;
      meshCompareRef.current.rotation.x += deltaY * 0.01;
    }

    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || !meshRef.current || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - previousMousePositionRef.current.x;
    const deltaY = e.touches[0].clientY - previousMousePositionRef.current.y;

    meshRef.current.rotation.y += deltaX * 0.01;
    meshRef.current.rotation.x += deltaY * 0.01;

    if (meshCompareRef.current) {
      meshCompareRef.current.rotation.y += deltaX * 0.01;
      meshCompareRef.current.rotation.x += deltaY * 0.01;
    }

    previousMousePositionRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  // Run AI Body Recommendation
  const runAiAdvisor = async () => {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai-breast-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userBody)
      });
      const data = await res.json();
      if (data.success && data.recommendation) {
        setAiRecommendation(data.recommendation);
        setConfig(prev => ({
          ...prev,
          volumeCc: data.recommendation.recommendedCc,
          profile: data.recommendation.recommendedProfile.includes("High") ? "High" : "Moderate Plus"
        }));
      }
    } catch (err) {
      console.error("AI advisor error:", err);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-0">
      
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 text-slate-900 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" /> MÔ PHỎNG SỐ HÓA 3D & AR KÍCH THƯỚC TÚI NGỰC
          </div>
          <h2 className="text-lg sm:text-2xl font-extrabold tracking-tight text-slate-900">
            Thử Size Túi Ngực Ergonomix 3D & Tỷ Lệ Vàng Y Khoa
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm mt-1 font-medium leading-relaxed">
            Mô phỏng 3D thời gian thực: xoay 360°, tinh chỉnh thể tích (200cc - 550cc), độ nhô profile và tính toán đường kính chuẩn theo sinh trắc học.
          </p>
        </div>

        <button
          onClick={() =>
            onBookAppointment(
              "Thử Size Túi Ngực 3D Ergonomix",
              `Đã chọn 3D: ${config.volumeCc}cc, Độ nhô ${config.profile}, Dáng ${config.shape}`
            )
          }
          className="hidden md:flex bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-white font-extrabold px-5 py-3 rounded-xl shadow-md transition items-center justify-center gap-2 shrink-0 text-xs sm:text-sm"
        >
          <Calendar className="w-4 h-4" /> Đặt Lịch Thử Size Thực Tế
        </button>
      </div>

      {/* Mobile Sub-Tab Navigation Bar (Visible only on Mobile screens) */}
      <div className="sm:hidden grid grid-cols-3 gap-1 bg-slate-200/70 p-1 rounded-xl text-xs font-bold text-slate-700">
        <button
          onClick={() => setMobileTab("viewer")}
          className={`py-2 px-2 rounded-lg text-center transition flex items-center justify-center gap-1 ${
            mobileTab === "viewer"
              ? "bg-white text-amber-800 shadow-xs font-extrabold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Box className="w-3.5 h-3.5 text-amber-600" /> Mô Phỏng 3D
        </button>
        <button
          onClick={() => setMobileTab("specs")}
          className={`py-2 px-2 rounded-lg text-center transition flex items-center justify-center gap-1 ${
            mobileTab === "specs"
              ? "bg-white text-slate-950 shadow-xs font-extrabold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-slate-700" /> Thông Số
        </button>
        <button
          onClick={() => setMobileTab("ai")}
          className={`py-2 px-2 rounded-lg text-center transition flex items-center justify-center gap-1 ${
            mobileTab === "ai"
              ? "bg-white text-emerald-800 shadow-xs font-extrabold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Cpu className="w-3.5 h-3.5 text-emerald-600" /> AI Đề Xuất
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        
        {/* Left Column: 3D Canvas Visualizer */}
        <div className={`lg:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col ${
          mobileTab !== "viewer" ? "hidden sm:flex" : "flex"
        }`}>
          
          {/* Top Control Bar inside Canvas */}
          <div className="bg-[#0B192C] px-3 py-2 sm:px-3.5 sm:py-2.5 border-b border-slate-800 flex items-center justify-between text-white flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
              <span className="text-xs font-bold text-slate-100 font-mono">
                {compareMode ? `${config.volumeCc}cc vs ${compareVolumeCc}cc` : `Silicone 3D: ${config.volumeCc} CC`}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setArOverlayMode(arOverlayMode === "silhouette" ? "none" : "silhouette")}
                className={`text-[10px] sm:text-[11px] px-2 py-1 rounded-lg font-bold border transition flex items-center gap-1 ${
                  arOverlayMode === "silhouette"
                    ? "bg-emerald-500 text-slate-950 border-emerald-400"
                    : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                }`}
              >
                <Eye className="w-3 h-3" /> AR Silhouette
              </button>

              <button
                onClick={() => setViewMode(viewMode === "silicone" ? "wireframe" : "silicone")}
                className={`text-[10px] sm:text-[11px] px-2 py-1 rounded-lg font-bold border transition flex items-center gap-1 ${
                  viewMode === "wireframe"
                    ? "bg-amber-500 text-slate-950 border-amber-400"
                    : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                }`}
              >
                <Layers className="w-3 h-3" /> {viewMode === "wireframe" ? "Khung Lưới" : "Gel Thực"}
              </button>

              <button
                onClick={() => setCompareMode(!compareMode)}
                className={`text-[10px] sm:text-[11px] px-2 py-1 rounded-lg font-bold border transition ${
                  compareMode
                    ? "bg-amber-500 text-slate-950 border-amber-400"
                    : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                }`}
              >
                {compareMode ? "Tắt So Sánh" : "So Sánh"}
              </button>
            </div>
          </div>

          {/* Canvas Mount Container */}
          <div
            ref={mountRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
            className="w-full h-[320px] xs:h-[350px] sm:h-[400px] cursor-grab active:cursor-grabbing relative select-none touch-none bg-[#0B192C] overflow-hidden"
          >
            {/* AR Anatomical Chest Silhouette Overlay */}
            {arOverlayMode === "silhouette" && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-35">
                <svg viewBox="0 0 200 200" className="w-full h-full max-w-sm stroke-emerald-400 fill-none stroke-1">
                  <path d="M 40 40 C 70 80, 130 80, 160 40" strokeDasharray="3,3" />
                  <path d="M 50 100 C 50 150, 90 170, 100 170 C 110 170, 150 150, 150 100" strokeDasharray="4,4" />
                  <circle cx="100" cy="100" r="60" strokeDasharray="2,2" />
                  <line x1="100" y1="20" x2="100" y2="180" strokeDasharray="2,2" />
                  <line x1="20" y1="100" x2="180" y2="100" strokeDasharray="2,2" />
                </svg>
              </div>
            )}

            {/* Interactive hint overlay */}
            <div className="absolute bottom-3 left-3 bg-[#0B192C]/90 backdrop-blur-md border border-slate-700/80 px-2.5 py-1.5 rounded-xl text-slate-300 text-[11px] flex items-center gap-1.5 pointer-events-none shadow-sm">
              <RotateCw className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: "10s" }} />
              Chạm / Swiping để xoay 360°
            </div>

            {/* Spec Overlay Badge */}
            <div className="absolute top-3 right-3 bg-[#0B192C]/95 backdrop-blur-md border border-amber-500/40 p-2 sm:p-3 rounded-xl text-[10px] sm:text-[11px] space-y-0.5 sm:space-y-1 text-slate-200 shadow-lg">
              <div className="text-amber-400 font-extrabold text-[11px] sm:text-xs flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> MOTIVA ERGONOMIX®
              </div>
              <div>Thể tích: <span className="font-extrabold text-white font-mono">{config.volumeCc} CC</span></div>
              <div>Độ nhô: <span className="font-bold text-amber-300">{config.profile}</span></div>
              <div>Đường kính: <span className="font-bold text-emerald-400 font-mono">{baseDiameterCm} cm</span></div>
              <div>Độ cao nhô: <span className="font-bold text-emerald-400 font-mono">{projectionCm} cm</span></div>
            </div>
          </div>

          {/* Quick Slider & Presets Controls */}
          <div className="p-3.5 sm:p-4 bg-[#0B192C] border-t border-slate-800 space-y-3 text-white">
            
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-bold uppercase tracking-wide">Kích Thước Thể Tích (CC):</span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => adjustVolume(-5)}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-mono font-bold w-7 h-7 rounded-lg border border-slate-700 flex items-center justify-center text-xs active:scale-95"
                >
                  -5
                </button>
                <span className="text-amber-400 font-extrabold text-sm sm:text-base font-mono bg-amber-950/80 px-2.5 py-0.5 rounded-lg border border-amber-500/30">
                  {config.volumeCc} CC
                </span>
                <button 
                  onClick={() => adjustVolume(5)}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-mono font-bold w-7 h-7 rounded-lg border border-slate-700 flex items-center justify-center text-xs active:scale-95"
                >
                  +5
                </button>
              </div>
            </div>

            <input id="volumecc_520" name="volumecc_520"
              type="range"
              min="200"
              max="550"
              step="5"
              value={config.volumeCc}
              onChange={(e) => setConfig({ ...config, volumeCc: Number(e.target.value) })}
              className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />

            {/* Size Preset Fast Selection Buttons */}
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Size Nhanh Phổ Biến:</span>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {PRESET_VOLUMES.map((cc) => (
                  <button
                    key={cc}
                    onClick={() => setConfig({ ...config, volumeCc: cc })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition shrink-0 active:scale-95 ${
                      config.volumeCc === cc
                        ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-sm font-extrabold scale-105 border border-amber-300"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                    }`}
                  >
                    {cc}cc
                  </button>
                ))}
              </div>
            </div>

            {compareMode && (
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-400 font-bold">Size So Sánh Bổ Sung:</span>
                  <span className="text-emerald-400 font-extrabold font-mono bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                    {compareVolumeCc} CC
                  </span>
                </div>
                <input id="comparevolumecc_558" name="comparevolumecc_558"
                  type="range"
                  min="200"
                  max="550"
                  step="5"
                  value={compareVolumeCc}
                  onChange={(e) => setCompareVolumeCc(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Parameters Tuning & AI Advisor */}
        <div className="lg:col-span-5 space-y-4 sm:space-y-6">
          
          {/* Parameter Tuning Box */}
          <div className={`bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 text-slate-900 space-y-4 shadow-xs ${
            mobileTab !== "specs" ? "hidden sm:block" : "block"
          }`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="font-extrabold text-slate-900 flex items-center gap-2 text-xs sm:text-sm">
                <Sliders className="w-4 h-4 text-amber-600" /> Tinh Chỉnh Thông Số Dáng Túi
              </h3>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">FDA Approved</span>
            </div>

            {/* Profile Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Độ Nhô (Profile Degree):
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {(["Low", "Moderate Plus", "High", "Extra High"] as const).map((prof) => (
                  <button
                    key={prof}
                    onClick={() => setConfig({ ...config, profile: prof })}
                    className={`py-2 px-2.5 rounded-xl border text-center transition text-[11px] font-semibold active:scale-95 ${
                      config.profile === prof
                        ? "bg-amber-100 border-amber-300 text-amber-950 font-extrabold shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {prof === "Low" && "Low (Thấp)"}
                    {prof === "Moderate Plus" && "Moderate+ (Vừa)"}
                    {prof === "High" && "High (Nhô Cao)"}
                    {prof === "Extra High" && "Extra High (Siêu)"}
                  </button>
                ))}
              </div>
            </div>

            {/* Shape & Gel */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hình Dáng (Shape):
                </label>
                <select id="shape_617" name="shape_617"
                  value={config.shape}
                  onChange={(e) => setConfig({ ...config, shape: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-medium"
                >
                  <option value="Ergonomix">Ergonomix (Linh Hoạt)</option>
                  <option value="Round">Round (Dáng Tròn)</option>
                  <option value="Anatomical">Anatomical (Giọt Nước)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chất Gel (Gel Type):
                </label>
                <select id="geltype_632" name="geltype_632"
                  value={config.gelType}
                  onChange={(e) => setConfig({ ...config, gelType: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-medium"
                >
                  <option value="ProgressiveGel">ProgressiveGel</option>
                  <option value="UltimaGel">UltimaGel (Cực Mềm)</option>
                  <option value="CohesiveIII">Cohesive III (Siêu Định Hình)</option>
                </select>
              </div>
            </div>

            {/* Live Spec Calculator Table */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1.5 text-xs">
              <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Thông Số Kỹ Thuật Dự Kiến:</div>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-medium block">Thể tích</span>
                  <span className="font-mono font-extrabold text-amber-700 text-xs">{config.volumeCc} cc</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-medium block">Đường kính</span>
                  <span className="font-mono font-extrabold text-slate-900 text-xs">{baseDiameterCm} cm</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-medium block">Độ nhô</span>
                  <span className="font-mono font-extrabold text-emerald-700 text-xs">{projectionCm} cm</span>
                </div>
              </div>
            </div>

          </div>

          {/* AI Golden Ratio Calculator Box */}
          <div className={`bg-white border border-amber-300/80 rounded-2xl p-4 sm:p-5 text-slate-900 space-y-3.5 shadow-xs ${
            mobileTab !== "ai" ? "hidden sm:block" : "block"
          }`}>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <Cpu className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-900">AI Tính Size Tỷ Lệ Vàng Cơ Thể</h3>
                <p className="text-[11px] text-slate-500 font-medium">Nhập sinh trắc học để Gemini AI đề xuất size tối ưu</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="text-slate-700 text-[11px] font-bold block mb-1">Chiều cao (cm):</label>
                <input id="height_680" name="height_680"
                  type="number"
                  value={userBody.height}
                  onChange={(e) => setUserBody({ ...userBody, height: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="text-slate-700 text-[11px] font-bold block mb-1">Cân nặng (kg):</label>
                <input id="weight_690" name="weight_690"
                  type="number"
                  value={userBody.weight}
                  onChange={(e) => setUserBody({ ...userBody, weight: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="text-slate-700 text-[11px] font-bold block mb-1">Vòng 1 (cm):</label>
                <input id="currentbust_700" name="currentbust_700"
                  type="number"
                  value={userBody.currentBust}
                  onChange={(e) => setUserBody({ ...userBody, currentBust: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="text-slate-700 text-[11px] font-bold block mb-1">Phong cách thích:</label>
                <select id="desiredlook_710" name="desiredlook_710"
                  value={userBody.desiredLook}
                  onChange={(e) => setUserBody({ ...userBody, desiredLook: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-semibold"
                >
                  <option value="natural">Tự Nhiên Mềm Mại</option>
                  <option value="dramatic">Gợi Cảm Nóng Bỏng</option>
                </select>
              </div>
            </div>

            <button
              onClick={runAiAdvisor}
              disabled={aiLoading}
              className="w-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-2 shadow-xs"
            >
              {aiLoading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin text-amber-600" /> Đang Phân Tích Chỉ Số Sinh Trắc...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-600" /> Chạy AI Đề Xuất Size Chuẩn
                </>
              )}
            </button>

            {aiRecommendation && (
              <div className="bg-amber-50/70 border border-amber-300 p-3.5 rounded-xl text-xs space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between text-amber-950 font-bold">
                  <span>Kết Quả AI Đề Xuất:</span>
                  <span className="text-sm font-mono font-extrabold text-amber-700">{aiRecommendation.recommendedCc} CC</span>
                </div>
                <div className="text-slate-700 text-[11px] leading-relaxed font-medium">
                  {aiRecommendation.reasoning}
                </div>
                <div className="text-slate-500 text-[10px] font-medium">
                  Khoảng an toàn khuyến nghị: <span className="text-slate-900 font-mono font-bold">{aiRecommendation.idealRange}</span>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Floating Sticky Mobile Booking Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 z-40 flex items-center justify-between gap-3 text-white shadow-2xl">
        <div className="space-y-0.5">
          <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wide">Size Đang Mô Phỏng:</div>
          <div className="text-sm font-extrabold font-mono text-white flex items-center gap-1.5">
            {config.volumeCc} CC <span className="text-xs font-normal text-slate-300">({config.profile})</span>
          </div>
        </div>

        <button
          onClick={() =>
            onBookAppointment(
              "Thử Size Túi Ngực 3D Ergonomix",
              `Đã chọn 3D: ${config.volumeCc}cc, Độ nhô ${config.profile}, Dáng ${config.shape}`
            )
          }
          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs shadow-md transition flex items-center gap-1.5 shrink-0"
        >
          <Calendar className="w-4 h-4" /> Đặt Lịch Thử Size
        </button>
      </div>
    </div>
  );
};

