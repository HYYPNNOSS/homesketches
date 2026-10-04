"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { SketchEngine } from "../../../components/sketch-space/engine";
import { SketchToolbar } from "../../../components/sketch-space/SketchToolbar";
import { RenderPanel } from "../../../components/sketch-space/RenderPanel";
import { StudioShell } from "../../../components/dashboard/StudioShell";
import type {
  ToolKind,
  ViewMode,
  FurnitureKind,
  Scene,
} from "../../../components/sketch-space/types";

export default function SketchSpacePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SketchEngine | null>(null);

  // Synced state from engine
  const [activeTool, setActiveTool] = useState<ToolKind>("wall");
  const [activeView, setActiveView] = useState<ViewMode>("top");
  const [activeFurniture, setActiveFurniture] = useState<FurnitureKind>("bed");
  const [orthogonalLock, setOrthogonalLock] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sceneData, setSceneData] = useState<Scene | null>(null);

  // Initialise the engine once the canvas is mounted
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set initial canvas size
    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    resize();

    const engine = new SketchEngine(canvas);
    engineRef.current = engine;

    const offScene = engine.on("scene-change", (data) => setSceneData(data as Scene));
    const offHistory = engine.on("history-change", (data) => {
      const { canUndo: u, canRedo: r } = data as { canUndo: boolean; canRedo: boolean };
      setCanUndo(u);
      setCanRedo(r);
    });

    const ro = new ResizeObserver(() => {
      engineRef.current?.triggerResize();
    });
    ro.observe(canvas.parentElement ?? canvas);

    return () => {
      offScene();
      offHistory();
      engine.destroy();
      ro.disconnect();
      engineRef.current = null;
    };
  }, []);

  // ── Tool handlers ─────────────────────────────────────────────────────────
  const handleTool = useCallback((t: ToolKind) => {
    setActiveTool(t);
    engineRef.current?.setTool(t);
  }, []);

  const handleView = useCallback((v: ViewMode) => {
    setActiveView(v);
    engineRef.current?.setView(v);
  }, []);

  const handleFurniture = useCallback((f: FurnitureKind) => {
    setActiveFurniture(f);
    engineRef.current?.setFurniture(f);
  }, []);

  const handleOrthogonal = useCallback((v: boolean) => {
    setOrthogonalLock(v);
    engineRef.current?.setOrthogonalLock(v);
  }, []);

  const handleLengthInput = useCallback((m: number | null) => {
    engineRef.current?.setLengthOverride(m);
  }, []);

  const handleUndo = useCallback(() => engineRef.current?.undo(), []);
  const handleRedo = useCallback(() => engineRef.current?.redo(), []);
  const handleClear = useCallback(() => engineRef.current?.clearScene(), []);

  // ── Capture helper ────────────────────────────────────────────────────────
  const handleCapture = useCallback((): { top: string; persp: string } => {
    const eng = engineRef.current;
    if (!eng) return { top: "", persp: "" };
    return {
      top: eng.captureTopDown(),
      persp: eng.capturePerspective(),
    };
  }, []);

  // ── Export helpers ────────────────────────────────────────────────────────
  const handleExportSVG = useCallback(() => {
    const eng = engineRef.current;
    if (!eng) return;
    const svg = eng.exportSVG();
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `floor-plan-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleExportJSON = useCallback(() => {
    const eng = engineRef.current;
    if (!eng) return;
    const json = JSON.stringify(eng.getScene(), null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scene-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleExportGLB = useCallback(async () => {
    const eng = engineRef.current;
    if (!eng) return;
    try {
      const buffer = await eng.exportGLB();
      const blob = new Blob([buffer], { type: "model/gltf-binary" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `scene-${Date.now()}.glb`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("GLB export failed:", err);
      alert("GLB export failed. See console for details.");
    }
  }, []);

  // ── Walkthrough recording ─────────────────────────────────────────────────
  const handleStartWalkthrough = useCallback(() => {
    const eng = engineRef.current;
    if (!eng) return;
    const started = eng.startWalkthrough((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `walkthrough-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      setIsRecording(false);
    });
    if (started) setIsRecording(true);
  }, []);

  const handleStopWalkthrough = useCallback(() => {
    engineRef.current?.stopWalkthrough();
    setIsRecording(false);
  }, []);

  // ── Send to workspace cards ───────────────────────────────────────────────
  const handleSendToFloorPlan = useCallback(() => {
    // Navigate to dashboard with clean2d preset — simplest integration point
    window.location.href = "/dashboard?look=clean2d";
  }, []);

  const handleSendTo3D = useCallback(() => {
    handleExportGLB();
  }, [handleExportGLB]);

  const sceneSummary = sceneData
    ? engineRef.current?.getSceneSummary() ?? "Empty scene"
    : "Empty scene";

  return (
    <StudioShell
      active="/dashboard/sketch"
      eyebrow="Sketch Space"
      title="Draw a space. Render it."
      fullBleed
      hideHeader
    >
      <div className="sk-page">
        {/* Toolbar */}
        <SketchToolbar
          activeTool={activeTool}
          activeView={activeView}
          activeFurniture={activeFurniture}
          orthogonalLock={orthogonalLock}
          canUndo={canUndo}
          canRedo={canRedo}
          isRecording={isRecording}
          onTool={handleTool}
          onView={handleView}
          onFurniture={handleFurniture}
          onOrthogonalLock={handleOrthogonal}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClear={handleClear}
          onLengthInput={handleLengthInput}
        />

        {/* Main area */}
        <div className="sk-main">
          {/* Canvas */}
          <div className="sk-canvas-wrap" aria-label="3D drawing canvas">
            <canvas
              ref={canvasRef}
              className="sk-canvas"
              tabIndex={0}
              aria-label={`Sketch canvas — ${activeView} view. Use drawing tools on the left.`}
            />

            {/* View badge */}
            <div className="sk-view-badge" aria-hidden="true">
              {activeView === "top" ? "Top-down · orthographic" : activeView === "perspective" ? "Perspective orbit" : "Eye-level · 1.6 m"}
            </div>

            {/* Corner hint */}
            {activeView === "top" && (
              <div className="sk-hint" aria-hidden="true">
                {activeTool === "wall" && "Click to start wall · click to end · Esc to cancel"}
                {activeTool === "room" && "Click corner · click opposite corner"}
                {activeTool === "door" && "Click near a wall to place door"}
                {activeTool === "window" && "Click near a wall to place window"}
                {activeTool === "furniture" && `Click to place ${activeFurniture}`}
                {activeTool === "label" && "Click to place text label"}
                {activeTool === "eraser" && "Click near element to erase"}
                {activeTool === "select" && "Click item to select · drag to move · R to rotate · Del to delete"}
                <div style={{ marginTop: "4px", opacity: 0.8 }}>
                  Tip: Hold <strong>Space</strong> or use trackpad to pan. Hold <strong>Alt</strong> to disable grid snapping.
                </div>
              </div>
            )}

            {activeView !== "top" && (
              <div className="sk-hint" aria-hidden="true">
                Drag to orbit · scroll to zoom · drawing tools active in top view only
              </div>
            )}
          </div>

          {/* Right panel */}
          <RenderPanel
            sceneSummary={sceneSummary}
            onCapture={handleCapture}
            onExportGLB={handleExportGLB}
            onExportSVG={handleExportSVG}
            onExportJSON={handleExportJSON}
            onStartWalkthrough={handleStartWalkthrough}
            onStopWalkthrough={handleStopWalkthrough}
            isRecording={isRecording}
            onSendToFloorPlan={handleSendToFloorPlan}
            onSendTo3D={handleSendTo3D}
          />
        </div>
      </div>
    </StudioShell>
  );
}
