"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { SketchEngine } from "../../../components/sketch-space/engine";
import type { SelectionChangeData } from "../../../components/sketch-space/engine";
import { SketchToolbar } from "../../../components/sketch-space/SketchToolbar";
import { RenderPanel } from "../../../components/sketch-space/RenderPanel";
import { StudioShell } from "../../../components/dashboard/StudioShell";
import type {
  ToolKind,
  ViewMode,
  FurnitureKind,
  Scene,
  CanvasBounds,
  FloorLevel,
  GizmoMode,
  VirtualCamera,
} from "../../../components/sketch-space/types";

// ── Contextual floating toolbar (Features H1, C.6, B1) ───────────────────────

interface ContextMenu {
  screenX: number;
  screenY: number;
  type: "item" | "wall" | "opening" | "camera";
  id: string;
}

function ContextualToolbar({
  menu,
  scene,
  onRotate,
  onScaleChange,
  onWallHeight,
  onWallThickness,
  onWallColor,
  onOpeningWidth,
  onOpeningHeight,
  onOpeningSill,
  onSwitchCamera,
  onCaptureCamera,
  onCameraHeight,
  onCameraFov,
  onDelete,
  onDismiss,
}: {
  menu: ContextMenu;
  scene: Scene | null;
  onRotate?: () => void;
  onScaleChange?: (scale: number) => void;
  onWallHeight?: (h: number) => void;
  onWallThickness?: (th: number) => void;
  onWallColor?: (color: number) => void;
  onOpeningWidth?: (w: number) => void;
  onOpeningHeight?: (h: number) => void;
  onOpeningSill?: (sill: number) => void;
  onSwitchCamera?: (cam: VirtualCamera) => void;
  onCaptureCamera?: (cam: VirtualCamera) => void;
  onCameraHeight?: (h: number) => void;
  onCameraFov?: (fov: number) => void;
  onDelete: () => void;
  onDismiss: () => void;
}) {
  const selectedItem = scene?.items.find((i) => i.id === menu.id);
  const selectedWall = scene?.walls.find((w) => w.id === menu.id);
  const selectedOpening = scene?.openings.find((o) => o.id === menu.id);
  const selectedCamera = scene?.virtualCameras?.find((c) => c.id === menu.id);

  const winW = typeof window !== "undefined" ? window.innerWidth : 1280;
  const winH = typeof window !== "undefined" ? window.innerHeight : 800;
  const cardW = 252;
  const cardH = 280;
  const left = Math.min(Math.max(12, menu.screenX - cardW / 2), winW - cardW - 16);
  const top = Math.min(Math.max(64, menu.screenY - 30), winH - cardH - 20);

  const typeIcons: Record<string, string> = {
    item: "🪑",
    wall: "🧱",
    opening: selectedOpening?.type === "window" ? "🪟" : "🚪",
    camera: "📷",
  };

  const typeTitles: Record<string, string> = {
    item: selectedItem ? `${selectedItem.kind.charAt(0).toUpperCase() + selectedItem.kind.slice(1)}` : "Furniture Item",
    wall: "Wall Section",
    opening: selectedOpening ? `${selectedOpening.type.charAt(0).toUpperCase() + selectedOpening.type.slice(1)}` : "Wall Opening",
    camera: selectedCamera?.name ?? "Virtual Camera",
  };

  const WALL_MATERIALS = [
    { color: 0xf3f4f6, hex: "#f3f4f6", label: "White plaster" },
    { color: 0xe8dcc8, hex: "#e8dcc8", label: "Warm cream" },
    { color: 0x3d4234, hex: "#3d4234", label: "Dark slate" },
    { color: 0x994d38, hex: "#994d38", label: "Brick red" },
    { color: 0x8d6446, hex: "#8d6446", label: "Timber wood" },
    { color: 0x5a7a6a, hex: "#5a7a6a", label: "Sage olive" },
  ];

  return (
    <div
      className="sk-ctx"
      style={{ left, top }}
      role="dialog"
      aria-label={`${typeTitles[menu.type] ?? "Element"} properties`}
    >
      {/* ── Header ── */}
      <div className="sk-ctx-header">
        <span className="sk-ctx-icon">{typeIcons[menu.type] ?? "⚙"}</span>
        <span className="sk-ctx-title">{typeTitles[menu.type] ?? "Element"}</span>
        <button
          type="button"
          className="sk-ctx-close"
          onClick={onDismiss}
          title="Dismiss inspector (Esc)"
          aria-label="Dismiss inspector"
        >
          ✕
        </button>
      </div>

      {/* ── Body Properties ── */}
      <div className="sk-ctx-body">
        {/* Item properties */}
        {menu.type === "item" && selectedItem && (
          <>
            {onScaleChange && (
              <div className="sk-ctx-row">
                <span className="sk-ctx-label">Scale</span>
                <div className="sk-ctx-control">
                  <input
                    type="range"
                    min="0.2"
                    max="3.0"
                    step="0.05"
                    value={selectedItem.scale ?? 1.0}
                    onChange={(e) => onScaleChange(parseFloat(e.target.value))}
                    className="sk-ctx-slider"
                    aria-label="Item scale factor"
                  />
                  <span className="sk-ctx-val">{(selectedItem.scale ?? 1.0).toFixed(2)}×</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Wall properties */}
        {menu.type === "wall" && selectedWall && (
          <>
            {onWallHeight && (
              <div className="sk-ctx-row">
                <span className="sk-ctx-label">Height</span>
                <div className="sk-ctx-control">
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="5.0"
                    value={selectedWall.height ?? 2.7}
                    onChange={(e) => onWallHeight(parseFloat(e.target.value) || 2.7)}
                    className="sk-ctx-input"
                    aria-label="Wall height in metres"
                  />
                  <span className="sk-ctx-unit">m</span>
                </div>
              </div>
            )}
            {onWallThickness && (
              <div className="sk-ctx-row">
                <span className="sk-ctx-label">Thickness</span>
                <div className="sk-ctx-control">
                  <input
                    type="number"
                    step="0.02"
                    min="0.05"
                    max="0.6"
                    value={selectedWall.thickness ?? 0.15}
                    onChange={(e) => onWallThickness(parseFloat(e.target.value) || 0.15)}
                    className="sk-ctx-input"
                    aria-label="Wall thickness in metres"
                  />
                  <span className="sk-ctx-unit">m</span>
                </div>
              </div>
            )}
            {onWallColor && (
              <div className="sk-ctx-row" style={{ alignItems: "flex-start", paddingTop: "4px" }}>
                <span className="sk-ctx-label" style={{ paddingTop: "2px" }}>Finish</span>
                <div className="sk-ctx-swatches">
                  {WALL_MATERIALS.map((m) => (
                    <button
                      key={m.hex}
                      type="button"
                      className={`sk-ctx-swatch ${selectedWall.color === m.color ? "active" : ""}`}
                      style={{ background: m.hex }}
                      onClick={() => onWallColor(m.color)}
                      title={m.label}
                      aria-label={m.label}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Opening properties */}
        {menu.type === "opening" && selectedOpening && (
          <>
            {onOpeningWidth && (
              <div className="sk-ctx-row">
                <span className="sk-ctx-label">Width</span>
                <div className="sk-ctx-control">
                  <input
                    type="number"
                    step="0.05"
                    min="0.4"
                    max="3.5"
                    value={selectedOpening.w}
                    onChange={(e) => onOpeningWidth(parseFloat(e.target.value) || 0.9)}
                    className="sk-ctx-input"
                    aria-label="Opening width in metres"
                  />
                  <span className="sk-ctx-unit">m</span>
                </div>
              </div>
            )}
            {onOpeningHeight && (
              <div className="sk-ctx-row">
                <span className="sk-ctx-label">Height</span>
                <div className="sk-ctx-control">
                  <input
                    type="number"
                    step="0.05"
                    min="0.4"
                    max="3.5"
                    value={selectedOpening.h ?? (selectedOpening.type === "window" ? 1.2 : 2.7)}
                    onChange={(e) => onOpeningHeight(parseFloat(e.target.value) || 2.1)}
                    className="sk-ctx-input"
                    aria-label="Opening height in metres"
                  />
                  <span className="sk-ctx-unit">m</span>
                </div>
              </div>
            )}
            {selectedOpening.type === "window" && onOpeningSill && (
              <div className="sk-ctx-row">
                <span className="sk-ctx-label">Sill Height</span>
                <div className="sk-ctx-control">
                  <input
                    type="number"
                    step="0.05"
                    min="0.0"
                    max="2.2"
                    value={selectedOpening.sillHeight ?? 0.9}
                    onChange={(e) => onOpeningSill(parseFloat(e.target.value) || 0.9)}
                    className="sk-ctx-input"
                    aria-label="Sill elevation in metres"
                  />
                  <span className="sk-ctx-unit">m</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Camera properties */}
        {menu.type === "camera" && selectedCamera && (
          <>
            {onCameraHeight && (
              <div className="sk-ctx-row">
                <span className="sk-ctx-label">Elevation</span>
                <div className="sk-ctx-control">
                  <input
                    type="number"
                    step="0.1"
                    min="0.3"
                    max="6.0"
                    value={selectedCamera.heightM}
                    onChange={(e) => onCameraHeight(parseFloat(e.target.value) || 1.6)}
                    className="sk-ctx-input"
                    aria-label="Camera elevation in metres"
                  />
                  <span className="sk-ctx-unit">m</span>
                </div>
              </div>
            )}
            {onCameraFov && (
              <div className="sk-ctx-row">
                <span className="sk-ctx-label">Field of View</span>
                <div className="sk-ctx-control">
                  <input
                    type="range"
                    min="25"
                    max="95"
                    step="5"
                    value={selectedCamera.fov}
                    onChange={(e) => onCameraFov(parseFloat(e.target.value) || 55)}
                    className="sk-ctx-slider"
                    aria-label="Camera field of view"
                  />
                  <span className="sk-ctx-val">{selectedCamera.fov}°</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Action buttons ── */}
      <div className="sk-ctx-actions">
        {/* Item rotate button */}
        {menu.type === "item" && onRotate && (
          <button
            type="button"
            className="sk-ctx-btn"
            onClick={onRotate}
            title="Rotate 45° clockwise"
          >
            <span>↻</span> Rotate 45°
          </button>
        )}

        {/* Camera action buttons */}
        {menu.type === "camera" && selectedCamera && (
          <div className="sk-ctx-btn-row">
            {onSwitchCamera && (
              <button
                type="button"
                className="sk-ctx-btn"
                onClick={() => onSwitchCamera(selectedCamera)}
                title="Switch viewpoint to this camera angle"
              >
                <span>👁</span> Look Through
              </button>
            )}
            {onCaptureCamera && (
              <button
                type="button"
                className="sk-ctx-btn"
                onClick={() => onCaptureCamera(selectedCamera)}
                title="Capture high-resolution photo"
              >
                <span>📸</span> Snap Photo
              </button>
            )}
          </div>
        )}

        <div className="sk-ctx-divider" />

        <button
          type="button"
          className="sk-ctx-btn sk-ctx-danger"
          onClick={onDelete}
          title="Delete selected element"
          aria-label="Delete selected element"
        >
          <span>✕</span> Delete Element
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SketchSpacePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SketchEngine | null>(null);
  // B-6: refs for stale-closure-safe access in non-React event listeners
  const contextMenuRef = useRef<ContextMenu | null>(null);
  const spacePressedRef = useRef(false);

  // Synced state from engine
  const [activeTool, setActiveTool] = useState<ToolKind>("wall");
  const [activeView, setActiveView] = useState<ViewMode>("top");
  const [activeFurniture, setActiveFurniture] = useState<FurnitureKind>("bed");
  const [orthogonalLock, setOrthogonalLock] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sceneData, setSceneData] = useState<Scene | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  // Keep ref in sync so event listeners can read it without stale closure
  contextMenuRef.current = contextMenu;

  // Multi-floor state (Feature E)
  const [floors, setFloors] = useState<FloorLevel[]>([]);
  const [activeFloorId, setActiveFloorId] = useState<string>("floor-0");

  // Canvas bounds state (Feature A)
  const [canvasBounds, setCanvasBounds] = useState<CanvasBounds | undefined>(undefined);

  // 3D gizmo mode (Feature B2)
  const [gizmoMode, setGizmoMode] = useState<GizmoMode>("translate");

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

    const offScene = engine.on("scene-change", (data) => {
      const s = data as Scene;
      setSceneData(s);
      setFloors([...engine.getFloors()]);
      setActiveFloorId(engine.getActiveFloorId());
      if (s.canvas) setCanvasBounds(s.canvas);
    });

    const offHistory = engine.on("history-change", (data) => {
      const { canUndo: u, canRedo: r } = data as { canUndo: boolean; canRedo: boolean };
      setCanUndo(u);
      setCanRedo(r);
    });

    const offSelection = engine.on("selection-change", (data) => {
      const sel = data as SelectionChangeData;
      if (sel.id && sel.type) {
        setContextMenu({
          screenX: sel.screenX,
          screenY: sel.screenY,
          type: sel.type,
          id: sel.id,
        });
      } else {
        setContextMenu(null);
      }
    });

    // B-6: Dismiss contextual toolbar whenever the user pans (Space+drag).
    // Uses refs to avoid stale closure — no canvas.dataset hack needed.
    const dismissOnPan = (e: PointerEvent) => {
      if (e.buttons > 0 && spacePressedRef.current && contextMenuRef.current) {
        setContextMenu(null);
      }
    };
    canvas.addEventListener("pointermove", dismissOnPan, { passive: true });
    // Track spacebar and Escape keys
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") spacePressedRef.current = true;
      if (e.key === "Escape" && contextMenuRef.current) {
        setContextMenu(null);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") spacePressedRef.current = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const ro = new ResizeObserver(() => {
      engineRef.current?.triggerResize();
    });
    ro.observe(canvas.parentElement ?? canvas);

    // Dismiss context menu on tool-change
    const offTool = engine.on("tool-change", () => setContextMenu(null));
    // B-6: Also dismiss on view change (coordinates become invalid in new projection)
    const offView = engine.on("view-change", () => setContextMenu(null));

    // Initial sync
    setSceneData(engine.getScene());
    setFloors([...engine.getFloors()]);
    setActiveFloorId(engine.getActiveFloorId());

    return () => {
      offScene();
      offHistory();
      offSelection();
      offTool();
      offView();
      canvas.removeEventListener("pointermove", dismissOnPan);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
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

  // ── Canvas bounds & Floor level handlers (Features A & E) ─────────────────
  const handleCanvasBoundsChange = useCallback((bounds: CanvasBounds) => {
    setCanvasBounds(bounds);
    engineRef.current?.setCanvasBounds(bounds);
  }, []);

  const handleSelectFloor = useCallback((floorId: string) => {
    setActiveFloorId(floorId);
    engineRef.current?.setActiveFloor(floorId);
  }, []);

  const handleAddFloor = useCallback(() => {
    const id = engineRef.current?.addFloor();
    if (id) {
      setActiveFloorId(id);
      setFloors([...(engineRef.current?.getFloors() ?? [])]);
    }
  }, []);

  const handleDeleteFloor = useCallback((floorId: string) => {
    engineRef.current?.deleteFloor(floorId);
    setFloors([...(engineRef.current?.getFloors() ?? [])]);
    setActiveFloorId(engineRef.current?.getActiveFloorId() ?? "floor-0");
  }, []);

  const handleGizmoModeChange = useCallback((mode: GizmoMode) => {
    setGizmoMode(mode);
    engineRef.current?.setGizmoMode(mode);
  }, []);

  // ── Contextual toolbar element updates ────────────────────────────────────
  const handleContextRotate = useCallback(() => {
    engineRef.current?.rotateSelected();
  }, []);

  const handleContextScale = useCallback((scale: number) => {
    if (!contextMenu || contextMenu.type !== "item") return;
    engineRef.current?.updateItem(contextMenu.id, { scale });
  }, [contextMenu]);

  const handleContextWallHeight = useCallback((height: number) => {
    if (!contextMenu || contextMenu.type !== "wall") return;
    engineRef.current?.updateWall(contextMenu.id, { height });
  }, [contextMenu]);

  const handleContextWallThickness = useCallback((thickness: number) => {
    if (!contextMenu || contextMenu.type !== "wall") return;
    engineRef.current?.updateWall(contextMenu.id, { thickness });
  }, [contextMenu]);

  const handleContextWallColor = useCallback((color: number) => {
    if (!contextMenu || contextMenu.type !== "wall") return;
    engineRef.current?.updateWall(contextMenu.id, { color });
  }, [contextMenu]);

  const handleContextOpeningWidth = useCallback((w: number) => {
    if (!contextMenu || contextMenu.type !== "opening") return;
    engineRef.current?.updateOpening(contextMenu.id, { w });
  }, [contextMenu]);

  const handleContextOpeningHeight = useCallback((h: number) => {
    if (!contextMenu || contextMenu.type !== "opening") return;
    engineRef.current?.updateOpening(contextMenu.id, { h });
  }, [contextMenu]);

  const handleContextOpeningSill = useCallback((sillHeight: number) => {
    if (!contextMenu || contextMenu.type !== "opening") return;
    engineRef.current?.updateOpening(contextMenu.id, { sillHeight });
  }, [contextMenu]);

  const handleContextDelete = useCallback(() => {
    engineRef.current?.deleteSelected();
    setContextMenu(null);
  }, []);

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
    const json = JSON.stringify(eng.getProject(), null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `project-${Date.now()}.json`;
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

  // ── Materials & Virtual Cameras handlers (Features D & G) ──────────────────
  const handleApplyRoomMaterial = useCallback((roomId: string, materialId: string) => {
    engineRef.current?.updateRoom(roomId, { materialId });
  }, []);

  const handleAddVirtualCamera = useCallback(() => {
    const eng = engineRef.current;
    if (!eng) return;
    const count = (sceneData?.virtualCameras?.length ?? 0) + 1;
    const vp = eng.getCurrentViewpoint();
    const cam: VirtualCamera = {
      id: "cam-" + Math.random().toString(36).slice(2, 9),
      name: `Camera ${count}`,
      position: vp.position,
      heightM: vp.heightM,
      targetPosition: vp.targetPosition,
      fov: vp.fov,
    };
    eng.addVirtualCamera(cam);
  }, [sceneData]);

  const handleSwitchCamera = useCallback((cam: VirtualCamera) => {
    engineRef.current?.switchToCamera(cam);
  }, []);

  const handleCaptureCamera = useCallback((cam: VirtualCamera) => {
    const eng = engineRef.current;
    if (!eng) return;
    const dataUrl = eng.captureFromCamera(cam, 1920, 1080);
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${cam.name.toLowerCase().replace(/\s+/g, "-")}-snapshot.png`;
    a.click();
  }, []);

  const handleDeleteCamera = useCallback((camId: string) => {
    engineRef.current?.removeVirtualCamera(camId);
  }, []);

  const handleUpdateCamera = useCallback((camId: string, updates: Partial<VirtualCamera>) => {
    engineRef.current?.updateVirtualCamera(camId, updates);
  }, []);

  const handleLoadGeneratedPlan = useCallback((generatedScene: Scene) => {
    // F-6: Confirm before wiping current floor — AI plan load is destructive
    const hasContent =
      (sceneData?.walls.length ?? 0) > 0 ||
      (sceneData?.rooms.length ?? 0) > 0 ||
      (sceneData?.items.length ?? 0) > 0;
    if (hasContent) {
      const ok = window.confirm(
        "Load AI-generated plan?\n\nThis will replace the current floor's content. Your other floors will be preserved.\n\nClick OK to continue, or Cancel to keep your existing layout."
      );
      if (!ok) return;
    }
    engineRef.current?.loadScene(generatedScene);
  }, [sceneData]);

  // ── Send to workspace cards ───────────────────────────────────────────────
  const handleSendToFloorPlan = useCallback(() => {
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
          canvasBounds={canvasBounds}
          floors={floors}
          activeFloorId={activeFloorId}
          gizmoMode={gizmoMode}
          onTool={handleTool}
          onView={handleView}
          onFurniture={handleFurniture}
          onOrthogonalLock={handleOrthogonal}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClear={handleClear}
          onLengthInput={handleLengthInput}
          onCanvasBoundsChange={handleCanvasBoundsChange}
          onSelectFloor={handleSelectFloor}
          onAddFloor={handleAddFloor}
          onDeleteFloor={handleDeleteFloor}
          onGizmoModeChange={handleGizmoModeChange}
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
              <span className="sk-view-badge-dot" />
              {activeView === "top"
                ? "Top-down · 2D Plan"
                : activeView === "perspective"
                ? "3D Perspective · Orbit"
                : "Eye-level · First-Person Walk"}
            </div>

            {/* Corner hint */}
            {activeView === "top" && (
              <div className="sk-hint" aria-hidden="true">
                {activeTool === "wall" && <span>Click to start wall · click to end · <kbd>Esc</kbd> to cancel</span>}
                {activeTool === "room" && <span>Click first corner · drag/click opposite corner</span>}
                {activeTool === "door" && <span>Click near wall to place door cutout</span>}
                {activeTool === "window" && <span>Click near wall to place window with sill</span>}
                {activeTool === "furniture" && <span>Click to place <strong>{activeFurniture}</strong></span>}
                {activeTool === "camera" && <span>Drag on floor to position virtual camera & target</span>}
                {activeTool === "label" && <span>Click on floor to place room label</span>}
                {activeTool === "eraser" && <span>Click element to erase</span>}
                {activeTool === "select" && <span>Click element to inspect & configure · drag wall nodes · <kbd>Del</kbd> to delete</span>}
                <div style={{ marginTop: "4px", opacity: 0.8, fontSize: "9.5px" }}>
                  Hold <kbd>Space</kbd> to pan · Hold <kbd>Alt</kbd> to disable snap · Hold <kbd>⇧ Shift</kbd> for orthogonal lock
                </div>
              </div>
            )}

            {activeView !== "top" && (
              <div className="sk-hint" aria-hidden="true">
                Left drag to orbit · Right drag or <kbd>Space</kbd> to pan · Scroll to zoom · Select items to manipulate with 3D gizmo
              </div>
            )}

            {/* Contextual floating toolbar */}
            {contextMenu && activeTool === "select" && (
              <ContextualToolbar
                menu={contextMenu}
                scene={sceneData}
                onRotate={contextMenu.type === "item" ? handleContextRotate : undefined}
                onScaleChange={contextMenu.type === "item" ? handleContextScale : undefined}
                onWallHeight={contextMenu.type === "wall" ? handleContextWallHeight : undefined}
                onWallThickness={contextMenu.type === "wall" ? handleContextWallThickness : undefined}
                onWallColor={contextMenu.type === "wall" ? handleContextWallColor : undefined}
                onOpeningWidth={contextMenu.type === "opening" ? handleContextOpeningWidth : undefined}
                onOpeningHeight={contextMenu.type === "opening" ? handleContextOpeningHeight : undefined}
                onOpeningSill={contextMenu.type === "opening" ? handleContextOpeningSill : undefined}
                onSwitchCamera={handleSwitchCamera}
                onCaptureCamera={handleCaptureCamera}
                onCameraHeight={(h) => engineRef.current?.updateVirtualCamera(contextMenu.id, { heightM: h })}
                onCameraFov={(fov) => engineRef.current?.updateVirtualCamera(contextMenu.id, { fov })}
                onDelete={handleContextDelete}
                onDismiss={() => setContextMenu(null)}
              />
            )}
          </div>

          {/* Right panel */}
          <RenderPanel
            sceneSummary={sceneSummary}
            sceneData={sceneData}
            onCapture={handleCapture}
            onExportGLB={handleExportGLB}
            onExportSVG={handleExportSVG}
            onExportJSON={handleExportJSON}
            onStartWalkthrough={handleStartWalkthrough}
            onStopWalkthrough={handleStopWalkthrough}
            isRecording={isRecording}
            onSendToFloorPlan={handleSendToFloorPlan}
            onSendTo3D={handleSendTo3D}
            onApplyRoomMaterial={handleApplyRoomMaterial}
            onAddVirtualCamera={handleAddVirtualCamera}
            onSwitchCamera={handleSwitchCamera}
            onCaptureCamera={handleCaptureCamera}
            onDeleteCamera={handleDeleteCamera}
            onUpdateCamera={handleUpdateCamera}
            onLoadGeneratedPlan={handleLoadGeneratedPlan}
          />
        </div>
      </div>
    </StudioShell>
  );
}
