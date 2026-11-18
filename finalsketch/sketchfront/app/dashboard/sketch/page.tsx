"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { SketchEngine } from "../../../components/sketch-space/engine";
import type { SelectionChangeData } from "../../../components/sketch-space/engine";
import { SketchToolbar } from "../../../components/sketch-space/SketchToolbar";
import { RenderPanel } from "../../../components/sketch-space/RenderPanel";
import { StudioShell } from "../../../components/dashboard/StudioShell";
import { PLAN_TEMPLATES } from "../../../components/sketch-space/templates";
import {
  BUILTIN_MATERIALS,
  isProject,
  isValidScene,
} from "../../../components/sketch-space/types";
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
  type: "item" | "wall" | "opening" | "camera" | "room";
  id: string;
}

/** Text field that only commits on blur / Enter, so typing a name is one undo step. */
function CommitInput({ value, onCommit, ariaLabel }: { value: string; onCommit: (v: string) => void; ariaLabel: string }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    const v = draft.trim();
    if (v && v !== value) onCommit(v);
    else setDraft(value);
  };
  return (
    <input
      type="text"
      className="sk-ctx-input sk-ctx-input-text"
      value={draft}
      maxLength={40}
      aria-label={ariaLabel}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") { setDraft(value); (e.target as HTMLInputElement).blur(); }
      }}
    />
  );
}

function ContextualToolbar({
  menu,
  scene,
  onRotate,
  onDuplicate,
  onRoomName,
  onRoomMaterial,
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
  onDuplicate?: () => void;
  onRoomName?: (name: string) => void;
  onRoomMaterial?: (materialId: string) => void;
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
  const selectedRoom = scene?.rooms.find((r) => r.id === menu.id);
  const wallLength = selectedWall
    ? Math.hypot(selectedWall.b[0] - selectedWall.a[0], selectedWall.b[1] - selectedWall.a[1])
    : 0;

  const winW = typeof window !== "undefined" ? window.innerWidth : 1280;
  const winH = typeof window !== "undefined" ? window.innerHeight : 800;
  const cardW = 252;
  const cardH = 320;
  const left = Math.min(Math.max(12, menu.screenX - cardW / 2), winW - cardW - 16);
  const top = Math.min(Math.max(64, menu.screenY - 30), winH - cardH - 20);

  const typeIcons: Record<string, string> = {
    item: "🪑",
    wall: "🧱",
    opening: selectedOpening?.type === "window" ? "🪟" : "🚪",
    camera: "📷",
    room: "▦",
  };

  const typeTitles: Record<string, string> = {
    item: selectedItem ? `${selectedItem.kind.charAt(0).toUpperCase() + selectedItem.kind.slice(1)}` : "Furniture Item",
    wall: "Wall Section",
    opening: selectedOpening ? `${selectedOpening.type.charAt(0).toUpperCase() + selectedOpening.type.slice(1)}` : "Wall Opening",
    camera: selectedCamera?.name ?? "Virtual Camera",
    room: selectedRoom?.name ?? "Room",
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

        {/* Room properties */}
        {menu.type === "room" && selectedRoom && (
          <>
            {onRoomName && (
              <div className="sk-ctx-row">
                <span className="sk-ctx-label">Name</span>
                <div className="sk-ctx-control">
                  <CommitInput value={selectedRoom.name} onCommit={onRoomName} ariaLabel="Room name" />
                </div>
              </div>
            )}
            <div className="sk-ctx-row">
              <span className="sk-ctx-label">Size</span>
              <span className="sk-ctx-val sk-ctx-val-wide">
                {selectedRoom.w.toFixed(1)} × {selectedRoom.d.toFixed(1)} m · {(selectedRoom.w * selectedRoom.d).toFixed(1)} m²
              </span>
            </div>
            {onRoomMaterial && (
              <div className="sk-ctx-row" style={{ alignItems: "flex-start", paddingTop: "4px" }}>
                <span className="sk-ctx-label" style={{ paddingTop: "2px" }}>Floor</span>
                <div className="sk-ctx-swatches">
                  {BUILTIN_MATERIALS.filter((m) => m.category === "floor").map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`sk-ctx-swatch ${selectedRoom.materialId === m.id ? "active" : ""}`}
                      style={{ background: m.previewColor }}
                      onClick={() => onRoomMaterial(m.id)}
                      title={m.name}
                      aria-label={m.name}
                      aria-pressed={selectedRoom.materialId === m.id}
                    />
                  ))}
                </div>
              </div>
            )}
            <p className="sk-ctx-tip">Drag the room to move it with its walls and furniture.</p>
          </>
        )}

        {/* Wall properties */}
        {menu.type === "wall" && selectedWall && (
          <>
            <div className="sk-ctx-row">
              <span className="sk-ctx-label">Length</span>
              <span className="sk-ctx-val sk-ctx-val-wide">{wallLength.toFixed(2)} m</span>
            </div>
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
        {menu.type === "item" && (onRotate || onDuplicate) && (
          <div className="sk-ctx-btn-row">
            {onRotate && (
              <button type="button" className="sk-ctx-btn" onClick={onRotate} title="Rotate 45° (R)">
                <span>↻</span> Rotate
              </button>
            )}
            {onDuplicate && (
              <button type="button" className="sk-ctx-btn" onClick={onDuplicate} title="Duplicate (Ctrl+D)">
                <span>⧉</span> Duplicate
              </button>
            )}
          </div>
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
          <span>✕</span> Delete {menu.type === "room" ? "room floor" : menu.type === "item" ? "item" : menu.type}
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

  // Starter-plan overlay (shown on an empty sheet) and transient status message
  const [startDismissed, setStartDismissed] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: "ok" | "error" } | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showNotice = useCallback((text: string, tone: "ok" | "error" = "ok") => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice({ text, tone });
    noticeTimer.current = setTimeout(() => setNotice(null), 5000);
  }, []);
  useEffect(() => () => { if (noticeTimer.current) clearTimeout(noticeTimer.current); }, []);

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

    // Keep the toolbar in step with the engine: keyboard shortcuts and camera
    // actions change the tool / view from inside the engine.
    const offTool = engine.on("tool-change", (t) => {
      setActiveTool(t as ToolKind);
      setContextMenu(null);
    });
    // B-6: Also dismiss on view change (coordinates become invalid in new projection)
    const offView = engine.on("view-change", (v) => {
      setActiveView(v as ViewMode);
      setContextMenu(null);
    });

    // Initial sync
    setActiveTool(engine.activeTool);
    setActiveView(engine.activeView);
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

  const handleContextDuplicate = useCallback(() => {
    engineRef.current?.duplicateSelected();
  }, []);

  const handleContextRoomName = useCallback((name: string) => {
    if (!contextMenu || contextMenu.type !== "room") return;
    engineRef.current?.updateRoom(contextMenu.id, { name });
  }, [contextMenu]);

  const handleContextRoomMaterial = useCallback((materialId: string) => {
    if (!contextMenu || contextMenu.type !== "room") return;
    engineRef.current?.updateRoom(contextMenu.id, { materialId });
  }, [contextMenu]);

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
      showNotice("3D model saved as a .glb file.");
    } catch (err) {
      console.error("GLB export failed:", err);
      showNotice("Couldn't export the 3D model. Try again after drawing at least one wall.", "error");
    }
  }, [showNotice]);

  // ── Open a saved project (the JSON written by "Save JSON") ───────────────
  const handleImportJSON = useCallback(async (file: File) => {
    const eng = engineRef.current;
    if (!eng) return;
    try {
      const data: unknown = JSON.parse(await file.text());
      if (isProject(data) && data.floors.length > 0 && data.floors.every((f) => isValidScene(f.scene))) {
        eng.setProject(data);
        setFloors([...eng.getFloors()]);
        setActiveFloorId(eng.getActiveFloorId());
        showNotice(`Opened "${file.name}" — ${data.floors.length} floor${data.floors.length === 1 ? "" : "s"}.`);
      } else if (isValidScene(data)) {
        eng.loadScene(data);
        showNotice(`Opened "${file.name}". Press Ctrl+Z to go back.`);
      } else {
        showNotice("That file isn't a Sketch Space project.", "error");
      }
    } catch {
      showNotice("Couldn't read that file — it isn't valid JSON.", "error");
    }
  }, [showNotice]);

  const handleTemplate = useCallback((templateId: string) => {
    const tpl = PLAN_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    engineRef.current?.loadScene(tpl.build());
    engineRef.current?.setTool("select");
    setStartDismissed(true);
    showNotice(`${tpl.label} loaded. Press 2 to see it in 3D.`);
  }, [showNotice]);

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
    // Loading replaces the current floor, but it is a normal undo step now,
    // so there is no blocking confirm — Ctrl+Z brings the old layout back.
    engineRef.current?.loadScene(generatedScene);
    engineRef.current?.setTool("select");
    setStartDismissed(true);
  }, []);

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

  const sceneIsEmpty =
    !sceneData || (!sceneData.walls.length && !sceneData.rooms.length && !sceneData.items.length);
  const showStart = sceneIsEmpty && !startDismissed && activeView === "top" && floors.length <= 1;
  const stats = {
    rooms: sceneData?.rooms.length ?? 0,
    area: sceneData?.rooms.reduce((sum, r) => sum + r.w * r.d, 0) ?? 0,
    wallLength:
      sceneData?.walls.reduce((sum, w) => sum + Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]), 0) ?? 0,
    items: sceneData?.items.filter((i) => i.kind !== "label").length ?? 0,
  };
  const VIEW_TABS: { mode: ViewMode; label: string; key: string }[] = [
    { mode: "top", label: "2D plan", key: "1" },
    { mode: "perspective", label: "3D model", key: "2" },
    { mode: "eye-level", label: "Walk inside", key: "3" },
  ];

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

            <div className="sk-topleft">
            {/* View switcher — the 2D ⇄ 3D toggle lives on the canvas itself */}
            <div className="sk-viewbar" role="tablist" aria-label="View">
              {VIEW_TABS.map((v) => (
                <button
                  key={v.mode}
                  type="button"
                  role="tab"
                  aria-selected={activeView === v.mode}
                  className={`sk-viewbar-btn ${activeView === v.mode ? "active" : ""}`}
                  onClick={() => handleView(v.mode)}
                  title={`${v.label} (${v.key})`}
                >
                  {v.label}
                  <kbd>{v.key}</kbd>
                </button>
              ))}
            </div>

            {/* Plan stats */}
            {!sceneIsEmpty && (
              <div className="sk-stats" aria-label="Plan summary">
                <span><strong>{stats.rooms}</strong> room{stats.rooms === 1 ? "" : "s"}</span>
                <span><strong>{stats.area.toFixed(1)}</strong> m² floor</span>
                <span><strong>{stats.wallLength.toFixed(1)}</strong> m walls</span>
                <span><strong>{stats.items}</strong> item{stats.items === 1 ? "" : "s"}</span>
              </div>
            )}
            </div>

            {/* Zoom controls */}
            <div className="sk-zoom" role="group" aria-label="Zoom">
              <button type="button" onClick={() => engineRef.current?.zoomBy(0.8)} title="Zoom out (−)" aria-label="Zoom out">−</button>
              <button type="button" onClick={() => engineRef.current?.fitView()} title="Fit plan to view (0)" className="sk-zoom-fit">Fit</button>
              <button type="button" onClick={() => engineRef.current?.zoomBy(1.25)} title="Zoom in (+)" aria-label="Zoom in">+</button>
            </div>

            {/* Starter overlay on an empty sheet */}
            {showStart && (
              <div className="sk-start" role="dialog" aria-label="Start a plan">
                <p className="sk-start-eyebrow">Sketch Space</p>
                <h2>Draw it flat. See it in 3D.</h2>
                <p className="sk-start-copy">Start from a plan you can edit, or draw your own. Switch to the 3D model at any time.</p>
                <div className="sk-start-grid">
                  {PLAN_TEMPLATES.map((t) => (
                    <button key={t.id} type="button" className="sk-start-card" onClick={() => handleTemplate(t.id)}>
                      <strong>{t.label}</strong>
                      <small>{t.hint}</small>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="sk-start-blank"
                  onClick={() => { setStartDismissed(true); handleTool("room"); }}
                >
                  Start from a blank sheet →
                </button>
              </div>
            )}

            {notice && (
              <div className={`sk-notice ${notice.tone === "error" ? "sk-notice-error" : ""}`} role="status">
                {notice.text}
              </div>
            )}

            {/* Corner hint */}
            {activeView === "top" && !showStart && (
              <div className="sk-hint" aria-hidden="true">
                {activeTool === "wall" && <span>Click to start · click to add corners · double-click or <kbd>Esc</kbd> to finish</span>}
                {activeTool === "room" && <span>Click one corner, then the opposite corner · walls are added for you</span>}
                {activeTool === "door" && <span>Click near wall to place door cutout</span>}
                {activeTool === "window" && <span>Click near wall to place window with sill</span>}
                {activeTool === "furniture" && <span>Click to place <strong>{activeFurniture}</strong></span>}
                {activeTool === "camera" && <span>Drag on floor to position virtual camera & target</span>}
                {activeTool === "label" && <span>Click on floor to place room label</span>}
                {activeTool === "eraser" && <span>Click element to erase</span>}
                {activeTool === "select" && <span>Click anything to edit it · drag rooms, furniture and wall ends · <kbd>Del</kbd> to delete</span>}
                <div style={{ marginTop: "4px", opacity: 0.8, fontSize: "9.5px" }}>
                  <kbd>Space</kbd>+drag to pan · <kbd>Ctrl</kbd>+scroll to zoom · <kbd>Alt</kbd> free placement · <kbd>⇧</kbd> straight walls
                </div>
              </div>
            )}

            {activeView === "perspective" && (
              <div className="sk-hint" aria-hidden="true">
                Drag to orbit · right-drag to pan · scroll to zoom · <kbd>0</kbd> fit · <kbd>1</kbd> back to the 2D plan to edit
              </div>
            )}
            {activeView === "eye-level" && (
              <div className="sk-hint" aria-hidden="true">
                <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or arrows to walk · <kbd>Q</kbd>/<kbd>E</kbd> to turn · drag to look around
              </div>
            )}

            {/* Contextual floating toolbar */}
            {contextMenu && activeTool === "select" && (
              <ContextualToolbar
                menu={contextMenu}
                scene={sceneData}
                onRotate={contextMenu.type === "item" ? handleContextRotate : undefined}
                onDuplicate={contextMenu.type === "item" ? handleContextDuplicate : undefined}
                onRoomName={contextMenu.type === "room" ? handleContextRoomName : undefined}
                onRoomMaterial={contextMenu.type === "room" ? handleContextRoomMaterial : undefined}
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
            onImportJSON={handleImportJSON}
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
