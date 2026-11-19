"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { SketchEngine } from "../../../components/sketch-space/engine";
import type { SelectionChangeData } from "../../../components/sketch-space/engine";
import { addAsset } from "../../../lib/workspace-store";
import { SelectionBar } from "../../../components/sketch-space/SelectionBar";
import { TracePanel } from "../../../components/sketch-space/TracePanel";
import type { SelectedObject } from "../../../components/sketch-space/selection";
import { RoomProperties } from "../../../components/sketch-space/RoomProperties";
import { ProjectBar } from "../../../components/sketch-space/ProjectBar";
import { SketchToolbar, ToolRail, FurniturePalette } from "../../../components/sketch-space/SketchToolbar";
import { SkIcon } from "../../../components/sketch-space/icons";
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
  Project,
  Item,
} from "../../../components/sketch-space/types";
import { BUILTIN_MATERIALS, FURNITURE_SIZES, FURNITURE_HEIGHTS, itemSize } from "../../../components/sketch-space/types";

// ── Selection inspector (shown in the design panel) ─────────────────────────

interface ContextMenu {
  screenX: number;
  screenY: number;
  type: "item" | "wall" | "opening" | "camera" | "room";
  id: string;
}

/** Numeric field that edits a draft and commits a clamped value on blur / Enter
 *  (one undo step per edit instead of one per keystroke). */
function NumberField({ label, value, min, max, step, unit = "m", onCommit }: {
  label: string; value: number; min: number; max: number; step: number; unit?: string; onCommit: (v: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(+value.toFixed(3))); }, [value]);
  const commit = () => {
    const v = parseFloat(draft);
    if (!Number.isFinite(v)) { setDraft(String(+value.toFixed(3))); return; }
    const clamped = Math.max(min, Math.min(max, v));
    setDraft(String(clamped));
    if (Math.abs(clamped - value) > 1e-9) onCommit(clamped);
  };
  return (
    <label className="sk-insp-field">
      <span>{label}</span>
      <span className="sk-insp-input">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={draft}
          aria-label={label}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            if (e.key === "Escape") { setDraft(String(+value.toFixed(3))); e.currentTarget.blur(); }
          }}
        />
        <em>{unit}</em>
      </span>
    </label>
  );
}

const WALL_MATERIALS = [
  { color: 0xf3f4f6, hex: "#f3f4f6", label: "White plaster" },
  { color: 0xe8dcc8, hex: "#e8dcc8", label: "Warm cream" },
  { color: 0x3d4234, hex: "#3d4234", label: "Dark slate" },
  { color: 0x994d38, hex: "#994d38", label: "Brick red" },
  { color: 0x8d6446, hex: "#8d6446", label: "Timber wood" },
  { color: 0x5a7a6a, hex: "#5a7a6a", label: "Sage olive" },
];

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
  engine,
}: {
  engine: SketchEngine | null;
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
  const cap = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);

  const typeIcons: Record<string, string> = {
    item: "furniture",
    wall: "wall",
    opening: selectedOpening?.type === "window" ? "window" : "door",
    camera: "camera",
  };
  const typeTitles: Record<string, string> = {
    item: selectedItem ? (selectedItem.name ?? cap(selectedItem.kind)) : "Furniture Item",
    wall: "Wall Section",
    opening: selectedOpening ? cap(selectedOpening.type) : "Wall Opening",
    camera: selectedCamera?.name ?? "Virtual Camera",
  };
  const wallLength = selectedWall ? Math.hypot(selectedWall.b[0] - selectedWall.a[0], selectedWall.b[1] - selectedWall.a[1]) : 0;

  return (
    <section className="sk-ctx" role="region" aria-label={`${typeTitles[menu.type] ?? "Element"} properties`}>
      <header className="sk-ctx-header">
        <span className="sk-ctx-icon"><SkIcon name={typeIcons[menu.type] ?? "select"} size={16} /></span>
        <span className="sk-ctx-title">
          {typeTitles[menu.type] ?? "Element"}
          {selectedWall && <small>{wallLength.toFixed(2)} m long</small>}
          {selectedItem && <small>{(selectedItem.rot * 180 / Math.PI).toFixed(0)}° · {(selectedItem.scale ?? 1).toFixed(2)}×</small>}
        </span>
        <button type="button" className="sk-ctx-close" onClick={onDismiss} title="Close inspector (Esc)" aria-label="Dismiss inspector">
          <SkIcon name="close" size={14} />
        </button>
      </header>

      <div className="sk-ctx-body">
        {menu.type === "item" && selectedItem && engine && (() => {
          const [w, d] = itemSize(selectedItem);
          const up = (u: Partial<Item>) => engine.updateItem(selectedItem.id, u);
          return (
            <>
              <label className="sk-insp-field"><span>Name</span><input key={selectedItem.id} defaultValue={selectedItem.name ?? ""} placeholder={cap(selectedItem.kind)} maxLength={80} aria-label="Item name" onBlur={e => { const v = e.target.value.trim(); if (v !== (selectedItem.name ?? "")) up({ name: v || undefined }); }} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }} /></label>
              <div className="sk-insp-grid">
                <NumberField label="X" value={selectedItem.x} min={-500} max={500} step={0.05} onCommit={x => up({ x })} />
                <NumberField label="Z" value={selectedItem.z} min={-500} max={500} step={0.05} onCommit={z => up({ z })} />
                <NumberField label="Rotation" unit="°" value={+((((selectedItem.rot * 180 / Math.PI) % 360) + 360) % 360).toFixed(1)} min={-360} max={360} step={5} onCommit={deg => up({ rot: deg * Math.PI / 180 })} />
                {selectedItem.kind !== "label" && <>
                  <NumberField label="Width" value={w} min={0.05} max={30} step={0.05} onCommit={v => up({ w: v === FURNITURE_SIZES[selectedItem.kind][0] ? undefined : v })} />
                  <NumberField label="Depth" value={d} min={0.01} max={30} step={0.05} onCommit={v => up({ d: v === FURNITURE_SIZES[selectedItem.kind][1] ? undefined : v })} />
                  <NumberField label="Height" value={selectedItem.h ?? FURNITURE_HEIGHTS[selectedItem.kind]} min={0.005} max={10} step={0.05} onCommit={v => up({ h: v === FURNITURE_HEIGHTS[selectedItem.kind] ? undefined : v })} />
                </>}
              </div>
              {selectedItem.kind !== "label" && (
                <label className="sk-insp-field"><span>Finish colour</span>
                  <span className="sk-insp-range">
                    <input type="color" aria-label="Item colour" value={`#${(selectedItem.color ?? 0x8a9a6a).toString(16).padStart(6, "0")}`} onChange={e => up({ color: parseInt(e.target.value.slice(1), 16) })} />
                    {selectedItem.color !== undefined && <button type="button" className="sk-ctx-btn" onClick={() => up({ color: undefined })}>Reset</button>}
                  </span>
                </label>
              )}
            </>
          );
        })()}

        {menu.type === "item" && selectedItem && onScaleChange && (
          <label className="sk-insp-field">
            <span>Scale</span>
            <span className="sk-insp-range">
              <input
                type="range" min="0.2" max="3.0" step="0.05"
                value={selectedItem.scale ?? 1.0}
                onChange={(e) => onScaleChange(parseFloat(e.target.value))}
                aria-label="Item scale factor"
              />
              <output>{(selectedItem.scale ?? 1.0).toFixed(2)}×</output>
            </span>
          </label>
        )}

        {menu.type === "wall" && selectedWall && (
          <>
            <div className="sk-insp-grid">
              {onWallHeight && <NumberField label="Height" value={selectedWall.height ?? 2.7} min={1} max={5} step={0.1} onCommit={onWallHeight} />}
              {onWallThickness && <NumberField label="Thickness" value={selectedWall.thickness ?? 0.15} min={0.05} max={0.6} step={0.01} onCommit={onWallThickness} />}
              {engine && <NumberField label="Length" value={+wallLength.toFixed(3)} min={0.1} max={500} step={0.05} onCommit={len => engine.setWallLength(selectedWall.id, len)} />}
            </div>
            {engine && (
              <div className="sk-insp-grid">
                <NumberField label="Start X" value={selectedWall.a[0]} min={-500} max={500} step={0.05} onCommit={x => engine.setWallEndpoint(selectedWall.id, "a", [x, selectedWall.a[1]])} />
                <NumberField label="Start Z" value={selectedWall.a[1]} min={-500} max={500} step={0.05} onCommit={z => engine.setWallEndpoint(selectedWall.id, "a", [selectedWall.a[0], z])} />
                <NumberField label="End X" value={selectedWall.b[0]} min={-500} max={500} step={0.05} onCommit={x => engine.setWallEndpoint(selectedWall.id, "b", [x, selectedWall.b[1]])} />
                <NumberField label="End Z" value={selectedWall.b[1]} min={-500} max={500} step={0.05} onCommit={z => engine.setWallEndpoint(selectedWall.id, "b", [selectedWall.b[0], z])} />
              </div>
            )}
            {engine && (
              <label className="sk-insp-field"><span>Texture</span>
                <select className="sk-select" aria-label="Wall texture" value={selectedWall.materialId ?? ""} onChange={e => engine.applyMaterial({ kind: "wall", id: selectedWall.id }, e.target.value || undefined)}>
                  <option value="">Plain colour</option>
                  {engine.getMaterials().map(m => <option key={m.id} value={m.id}>{m.name} (imported)</option>)}
                  {BUILTIN_MATERIALS.filter(m => m.category !== "floor").map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </label>
            )}
            {onWallColor && (
              <div className="sk-insp-field">
                <span>Finish</span>
                <div className="sk-ctx-swatches" role="group" aria-label="Wall finish">
                  {WALL_MATERIALS.map((m) => (
                    <button
                      key={m.hex}
                      type="button"
                      className={`sk-ctx-swatch${(selectedWall.color ?? 0xf3f4f6) === m.color ? " active" : ""}`}
                      style={{ background: m.hex }}
                      onClick={() => onWallColor(m.color)}
                      title={m.label}
                      aria-label={m.label}
                      aria-pressed={(selectedWall.color ?? 0xf3f4f6) === m.color}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {menu.type === "opening" && selectedOpening && (() => {
          const wall = scene?.walls.find(w => w.id === selectedOpening.wallId);
          if (!wall || !engine) return null;
          const L = Math.hypot(wall.b[0] - wall.a[0], wall.b[1] - wall.a[1]) || 1;
          const offset = Math.hypot(selectedOpening.at[0] - wall.a[0], selectedOpening.at[1] - wall.a[1]) - selectedOpening.w / 2;
          return (
            <div className="sk-insp-grid">
              <NumberField label="From wall start" value={+offset.toFixed(3)} min={0} max={Math.max(0, L - selectedOpening.w)} step={0.05} onCommit={o => { const t = (o + selectedOpening.w / 2) / L; engine.updateOpening(selectedOpening.id, { at: [wall.a[0] + (wall.b[0] - wall.a[0]) * t, wall.a[1] + (wall.b[1] - wall.a[1]) * t] }); }} />
              <label className="sk-insp-field"><span>Type</span>
                <select className="sk-select" aria-label="Opening type" value={selectedOpening.type} onChange={e => engine.updateOpening(selectedOpening.id, { type: e.target.value as "door" | "window", h: undefined, sillHeight: undefined })}>
                  <option value="door">Door</option><option value="window">Window</option>
                </select>
              </label>
            </div>
          );
        })()}

        {menu.type === "opening" && selectedOpening && (
          <div className="sk-insp-grid">
            {onOpeningWidth && <NumberField label="Width" value={selectedOpening.w} min={0.4} max={3.5} step={0.05} onCommit={onOpeningWidth} />}
            {onOpeningHeight && <NumberField label="Height" value={selectedOpening.h ?? (selectedOpening.type === "window" ? 1.2 : 2.1)} min={0.4} max={3.5} step={0.05} onCommit={onOpeningHeight} />}
            {selectedOpening.type === "window" && onOpeningSill && <NumberField label="Sill height" value={selectedOpening.sillHeight ?? 0.9} min={0} max={2.2} step={0.05} onCommit={onOpeningSill} />}
          </div>
        )}

        {menu.type === "camera" && selectedCamera && (
          <>
            {onCameraHeight && <NumberField label="Elevation" value={selectedCamera.heightM} min={0.3} max={6} step={0.1} onCommit={onCameraHeight} />}
            {onCameraFov && (
              <label className="sk-insp-field">
                <span>Field of view</span>
                <span className="sk-insp-range">
                  <input type="range" min="25" max="95" step="5" value={selectedCamera.fov} onChange={(e) => onCameraFov(parseFloat(e.target.value) || 55)} aria-label="Camera field of view" />
                  <output>{selectedCamera.fov}°</output>
                </span>
              </label>
            )}
          </>
        )}
      </div>

      <div className="sk-ctx-actions">
        {menu.type === "item" && onRotate && (
          <button type="button" className="sk-ctx-btn" onClick={onRotate} title="Rotate 45° clockwise (R)">
            <SkIcon name="rotate" size={15} /> Rotate 45°
          </button>
        )}
        {menu.type === "camera" && selectedCamera && onSwitchCamera && (
          <button type="button" className="sk-ctx-btn" onClick={() => onSwitchCamera(selectedCamera)} title="Switch viewpoint to this camera">
            <SkIcon name="eye-level" size={15} /> Look through
          </button>
        )}
        {menu.type === "camera" && selectedCamera && onCaptureCamera && (
          <button type="button" className="sk-ctx-btn" onClick={() => onCaptureCamera(selectedCamera)} title="Download a 1920×1080 snapshot">
            <SkIcon name="camera" size={15} /> Snapshot
          </button>
        )}
        <button type="button" className="sk-ctx-btn sk-ctx-danger" onClick={onDelete} title="Delete (Del)" aria-label="Delete selected element">
          <SkIcon name="trash" size={15} /> Delete
        </button>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SketchSpacePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SketchEngine | null>(null);
  const [engine, setEngine] = useState<SketchEngine | null>(null);
  const [viewport, setViewport] = useState({ zoom: 100, metresPerPixel: .02 });
  const [panelOpen, setPanelOpen] = useState(false);
  const [cursor, setCursor] = useState<[number,number]>([0,0]);
  const [pageNotice, setPageNotice] = useState("");
  const [selection, setSelection] = useState<SelectedObject[]>([]);
  const [canPaste, setCanPaste] = useState(false);
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
    setEngine(engine);
    setViewport(engine.viewportInfo());
    const offError = engine.on("interaction-error", message=>setPageNotice(String(message)));
    const offCursor = engine.on("cursor-change", data => setCursor(data as [number,number]));
    const offViewport = engine.on("viewport-change", data => setViewport(data as {zoom: number; metresPerPixel: number}));

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
      setSelection(sel.objects ?? []);setCanPaste(sel.canPaste ?? false);
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

    // Keep the plan framed while the layout settles (fonts, panels, sidebar)
    // until the user takes control of the camera.
    let userMovedView = false;
    const markInteracted = () => { userMovedView = true; };
    canvas.addEventListener("pointerdown", markInteracted, { passive: true });
    canvas.addEventListener("wheel", markInteracted, { passive: true });
    const ro = new ResizeObserver(() => {
      const eng = engineRef.current;
      if (!eng) return;
      if (!userMovedView) eng.fitToPlan(); else eng.triggerResize();
    });
    ro.observe(canvas.parentElement ?? canvas);

    // Dismiss context menu on tool-change
    const offTool = engine.on("tool-change", data => { setActiveTool(data as ToolKind); setContextMenu(null); });
    // B-6: Also dismiss on view change (coordinates become invalid in new projection)
    const offView = engine.on("view-change", data => { setActiveView(data as ViewMode); setContextMenu(null); });

    // Initial sync
    setSceneData(engine.getScene());
    setFloors([...engine.getFloors()]);
    setActiveFloorId(engine.getActiveFloorId());

    return () => {
      offError();
      offCursor();
      offViewport();
      offScene();
      offHistory();
      offSelection();
      offTool();
      offView();
      canvas.removeEventListener("pointermove", dismissOnPan);
      canvas.removeEventListener("pointerdown", markInteracted);
      canvas.removeEventListener("wheel", markInteracted);
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
    try { engineRef.current?.setCanvasBounds(bounds); setPageNotice(""); }
    catch (e) { setPageNotice(e instanceof Error ? e.message : "Could not resize canvas."); }
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
    engineRef.current?.updateWall(contextMenu.id, { color, materialId: undefined });
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
  const handleCapture = useCallback((cameraId?: string): { top: string; persp: string } => {
    const eng = engineRef.current;
    if (!eng) return { top: "", persp: "" };
    return {
      top: eng.captureTopDown(),
      persp: cameraId && eng.getVirtualCameras().find(c=>c.id===cameraId) ? eng.captureFromCamera(eng.getVirtualCameras().find(c=>c.id===cameraId)!,1024,768) : eng.capturePerspective(),
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
      setPageNotice("GLB export failed. Try again, or export SVG/JSON instead.");
    }
  }, []);

  // ── Walkthrough recording ─────────────────────────────────────────────────
  const handleStartWalkthrough = useCallback((seconds = 12) => {
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
    }, seconds);
    if (!started) setPageNotice("Walkthrough recording is not supported by this browser. Try a current desktop Chrome or Firefox.");
    if (started) setIsRecording(true);
  }, []);

  const handleStopWalkthrough = useCallback(() => {
    engineRef.current?.stopWalkthrough();
    setIsRecording(false);
  }, []);

  // ── Materials & Virtual Cameras handlers (Features D & G) ──────────────────

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

  const handleBuildProject = useCallback((project: Project): boolean => {
    const eng = engineRef.current;
    if (!eng) return false;
    const current = eng.getProject();
    const hasContent = current.floors.some(f => f.scene.walls.length || f.scene.rooms.length || f.scene.items.length);
    if (hasContent && !window.confirm("Build this JSON?\n\nIt replaces the current design (all floors). You can undo with Ctrl+Z.")) return false;
    try { eng.replaceProject(project); setPageNotice(""); return true; }
    catch (e) { setPageNotice(e instanceof Error ? e.message : "Could not build this JSON."); return false; }
  }, []);

  // ── Send to workspace cards ───────────────────────────────────────────────
  const handleSendToFloorPlan = useCallback(async () => {
    const eng=engineRef.current; if (!eng) return;
    try {
      const blob=await (await fetch(eng.captureTopDown())).blob();
      const asset=await addAsset(new File([blob],"sketch-floor-plan.png",{type:"image/png"}));
      window.location.href=`/dashboard?asset=${asset.id}`;
    } catch { setPageNotice("Could not send this sketch to Workspace. Export the SVG or JSON to keep a copy."); }
  }, []);

  const handleSendTo3D = useCallback(() => {
    handleExportGLB();
  }, [handleExportGLB]);

  const sceneSummary = sceneData
    ? engineRef.current?.getSceneSummary() ?? "Empty scene"
    : "Empty scene";

  const isSelecting = activeTool === "select" || activeTool === "box-select";
  const selectedRoom = contextMenu?.type === "room" ? sceneData?.rooms.find(r => r.id === contextMenu.id) : undefined;
  const scaleBarPx = Math.max(24, Math.min(120, 1 / viewport.metresPerPixel));
  const scaleBarLabel = 1 / viewport.metresPerPixel < 24 ? `${(24 * viewport.metresPerPixel).toFixed(1)} m` : "1 m";
  const isEmpty = !!sceneData && !sceneData.walls.length && !sceneData.rooms.length && !sceneData.items.length && !sceneData.reference;

  const hint = activeView !== "top"
    ? <>Drag to orbit · right-drag to pan · scroll to zoom{activeView === "eye-level" ? <> · <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / arrows to walk</> : <> · select an item to use the gizmo</>}</>
    : ({
        wall: <>Click to start, click to place each corner · <kbd>Esc</kbd> to finish</>,
        room: <>Click one corner, then the opposite corner</>,
        door: <>Click on a wall to cut a door</>,
        window: <>Click on a wall to add a window</>,
        furniture: <>Click to place <strong>{activeFurniture}</strong> · <kbd>R</kbd> in Select rotates</>,
        camera: <>Drag from the camera position towards what it should look at</>,
        label: <>Click on the floor to add a label</>,
        eraser: <>Click an element to erase it</>,
        select: <>Click to select · <kbd>Shift</kbd>-click to add · drag to move · <kbd>Del</kbd> deletes</>,
        "box-select": <>Drag a box around objects · <kbd>Shift</kbd> adds to the selection</>,
      } as Record<ToolKind, React.ReactNode>)[activeTool];

  return (
    <StudioShell
      active="/dashboard/sketch"
      eyebrow="Sketch Space"
      title="Draw a space. Render it."
      fullBleed
      hideHeader
    >
      <div className={`sk-page${panelOpen ? " sk-panel-open" : ""}`}>
        <ProjectBar engine={engine} onExport={handleExportJSON} />

        <SketchToolbar
          activeTool={activeTool}
          activeView={activeView}
          orthogonalLock={orthogonalLock}
          canUndo={canUndo}
          canRedo={canRedo}
          isRecording={isRecording}
          canvasBounds={canvasBounds}
          floors={floors}
          activeFloorId={activeFloorId}
          gizmoMode={gizmoMode}
          onView={handleView}
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
        >
          <button className="sk-panel-toggle sk-opt-btn" type="button" aria-label={panelOpen ? "Close design panel" : "Render & design"} aria-expanded={panelOpen} onClick={() => setPanelOpen(!panelOpen)}>
            <SkIcon name="panel" size={16} />
            <span>{panelOpen ? "Close design panel" : "Render & design"}</span>
          </button>
        </SketchToolbar>

        <div className="sk-main">
          <ToolRail activeTool={activeTool} onTool={handleTool} />

          <div className="sk-canvas-wrap">
            <canvas
              ref={canvasRef}
              className="sk-canvas"
              tabIndex={0}
              aria-label={`Sketch canvas — ${activeView} view. Use the drawing tools on the left.`}
            />

            {/* Top-left: contextual palette */}
            {activeTool === "furniture" && (
              <div className="sk-overlay sk-overlay-tl">
                <FurniturePalette active={activeFurniture} onPick={handleFurniture} />
              </div>
            )}

            {/* Top-right: tracing */}
            <div className="sk-overlay sk-overlay-tr">
              <TracePanel engine={engine} reference={sceneData?.reference} />
            </div>

            {/* Top-left: selection actions */}
            {isSelecting && (
              <div className="sk-overlay sk-overlay-tl">
                <SelectionBar engine={engine} objects={selection} canPaste={canPaste} />
              </div>
            )}

            {isEmpty && activeView === "top" && (
              <div className="sk-empty" aria-hidden="true">
                <strong>Start your plan</strong>
                <span>Pick <b>Wall</b> or <b>Room</b> on the left and click on the grid, trace an existing plan, or generate a layout from the <b>AI Plan</b> tab.</span>
              </div>
            )}

            {pageNotice && (
              <div className="sk-toast" role="alert">
                <span>{pageNotice}</span>
                <button type="button" aria-label="Dismiss message" onClick={() => setPageNotice("")}><SkIcon name="close" size={13} /></button>
              </div>
            )}

            {/* Bottom: hint + status/navigation */}
            <div className="sk-statusbar">
              <div className="sk-hint" aria-hidden="true">{hint}</div>
              <div className="sk-navigation" role="group" aria-label="Canvas navigation">
                <span className="sk-cursor-coordinates" title="Cursor position">X {cursor[0].toFixed(2)} · Z {cursor[1].toFixed(2)} m</span>
                <span className="sk-scale" title="Scale"><i style={{ width: scaleBarPx }} />{scaleBarLabel}</span>
                <span className="sk-nav-sep" aria-hidden="true" />
                <button type="button" className="sk-nav-icon" onClick={() => engine?.zoomBy(1 / 1.25)} aria-label="Zoom out" title="Zoom out (Ctrl + scroll)" disabled={activeView !== "top"}><SkIcon name="minus" size={14} /></button>
                <span className="sk-zoom" aria-label="Canvas zoom">{viewport.zoom}%</span>
                <button type="button" className="sk-nav-icon" onClick={() => engine?.zoomBy(1.25)} aria-label="Zoom in" title="Zoom in (Ctrl + scroll)" disabled={activeView !== "top"}><SkIcon name="plus" size={14} /></button>
                <button type="button" className="sk-nav-btn" onClick={() => engine?.fitToPlan()} aria-label="Fit to plan" title="Frame the whole plan"><SkIcon name="fit" size={14} /><span>Fit to plan</span></button>
                <button type="button" className="sk-nav-btn" onClick={() => engine?.resetView()} aria-label="Reset view" title="Back to the 2D plan, framed"><SkIcon name="reset" size={14} /><span>Reset view</span></button>
              </div>
            </div>
          </div>

          {/* Selection properties and render controls share one stable panel. */}
          <div className="sk-design-panel">
            <div className="sk-design-panel-head">
              <span>Design panel</span>
              <button type="button" className="sk-nav-icon" aria-label="Hide design panel" onClick={() => setPanelOpen(false)}><SkIcon name="close" size={14} /></button>
            </div>
            {selectedRoom && <RoomProperties room={selectedRoom} onMove={(dx, dz) => engine?.moveSelection(dx, dz)} onUpdate={updates => engine?.updateRoom(selectedRoom.id, updates)} onDelete={handleContextDelete} onDismiss={() => setContextMenu(null)} />}
            {contextMenu && contextMenu.type !== "room" && isSelecting && (
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
                engine={engine}
              />
            )}
            <RenderPanel
              sceneSummary={sceneSummary}
              sceneData={sceneData}
              onCapture={handleCapture}
              onGetProject={() => engine!.getProject()}
              onReorderCamera={(id,direction) => engine?.reorderCamera(id,direction)}
              onExportGLB={handleExportGLB}
              onExportSVG={handleExportSVG}
              onExportJSON={handleExportJSON}
              onStartWalkthrough={handleStartWalkthrough}
              onStopWalkthrough={handleStopWalkthrough}
              isRecording={isRecording}
              onSendToFloorPlan={handleSendToFloorPlan}
              onSendTo3D={handleSendTo3D}
              onAddVirtualCamera={handleAddVirtualCamera}
              onSwitchCamera={handleSwitchCamera}
              onCaptureCamera={handleCaptureCamera}
              onDeleteCamera={handleDeleteCamera}
              onUpdateCamera={handleUpdateCamera}
              onLoadGeneratedPlan={handleLoadGeneratedPlan}
              onBuildProject={handleBuildProject}
              engine={engine}
              selectedWallId={contextMenu?.type === "wall" ? contextMenu.id : undefined}
              selectedRoomId={contextMenu?.type === "room" ? contextMenu.id : undefined}
            />
          </div>
        </div>
      </div>
    </StudioShell>
  );
}
