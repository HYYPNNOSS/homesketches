"use client";

import { useEffect, useRef, useState } from "react";
import {
  FurnitureKind,
  ToolKind,
  ViewMode,
  FURNITURE_SIZES,
  CanvasBounds,
  FloorLevel,
  GizmoMode,
} from "./types";
import { SkIcon } from "./icons";

// ── Tool rail (left of the canvas) ───────────────────────────────────────────

const TOOL_GROUPS: { kind: ToolKind; label: string; short: string; shortcut: string }[][] = [
  [
    { kind: "select", label: "Select", short: "Select", shortcut: "V" },
    { kind: "box-select", label: "Box select", short: "Box", shortcut: "B" },
  ],
  [
    { kind: "wall", label: "Wall", short: "Wall", shortcut: "W" },
    { kind: "room", label: "Enclosed room", short: "Room", shortcut: "R" },
    { kind: "door", label: "Door", short: "Door", shortcut: "D" },
    { kind: "window", label: "Window", short: "Window", shortcut: "N" },
  ],
  [
    { kind: "furniture", label: "Furniture", short: "Furnish", shortcut: "F" },
    { kind: "label", label: "Label", short: "Label", shortcut: "L" },
    { kind: "camera", label: "Camera", short: "Camera", shortcut: "C" },
  ],
  [{ kind: "eraser", label: "Erase", short: "Erase", shortcut: "E" }],
];

export function ToolRail({ activeTool, onTool }: { activeTool: ToolKind; onTool: (t: ToolKind) => void }) {
  return (
    <nav className="sk-rail" role="toolbar" aria-label="Drawing tools" aria-orientation="vertical">
      {TOOL_GROUPS.map((group, i) => (
        <div className="sk-rail-group" key={i}>
          {group.map((t) => (
            <button
              key={t.kind}
              type="button"
              className={`sk-rail-btn${activeTool === t.kind ? " active" : ""}`}
              title={`${t.label} (${t.shortcut})`}
              aria-label={`${t.label}, shortcut ${t.shortcut}`}
              aria-pressed={activeTool === t.kind}
              onClick={() => onTool(t.kind)}
            >
              <SkIcon name={t.kind} size={19} />
              <span className="sk-rail-name">{t.short}</span>
              <kbd className="sk-rail-key">{t.shortcut}</kbd>
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}

// ── Furniture palette (floats over the canvas while Furniture is active) ────

const FURNITURE_LIST: FurnitureKind[] = [
  "bed", "sofa", "table", "chair", "wardrobe", "kitchen",
  "toilet", "bath", "tv", "rug", "plant", "stairs",
];

export function FurniturePalette({ active, onPick }: { active: FurnitureKind; onPick: (f: FurnitureKind) => void }) {
  return (
    <div className="sk-furn-palette" role="group" aria-label="Furniture">
      <p className="sk-overlay-title">Furniture <span>click the plan to place</span></p>
      <div className="sk-furn-grid">
        {FURNITURE_LIST.map((kind) => {
          const [w, d] = FURNITURE_SIZES[kind];
          return (
            <button
              key={kind}
              type="button"
              className={`sk-furn-chip${active === kind ? " active" : ""}`}
              aria-label={`${kind} ${w}×${d}m`}
              aria-pressed={active === kind}
              onClick={() => onPick(kind)}
            >
              <span>{kind}</span>
              <small>{w}×{d}m</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Options bar (above the canvas) ───────────────────────────────────────────

interface Props {
  activeTool: ToolKind;
  activeView: ViewMode;
  orthogonalLock: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isRecording: boolean;
  canvasBounds?: CanvasBounds;
  floors?: FloorLevel[];
  activeFloorId?: string;
  gizmoMode?: GizmoMode;
  onView: (v: ViewMode) => void;
  onOrthogonalLock: (v: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onLengthInput: (metres: number | null) => void;
  onCanvasBoundsChange?: (bounds: CanvasBounds) => void;
  onSelectFloor?: (floorId: string) => void;
  onAddFloor?: () => void;
  onDeleteFloor?: (floorId: string) => void;
  onGizmoModeChange?: (mode: GizmoMode) => void;
  children?: React.ReactNode;
}

const VIEWS: { mode: ViewMode; label: string; short: string }[] = [
  { mode: "top", label: "Top-down", short: "Plan" },
  { mode: "perspective", label: "Perspective", short: "3D" },
  { mode: "eye-level", label: "Eye level", short: "Walk" },
];

const CANVAS_PRESETS: { label: string; width: number; depth: number }[] = [
  { label: "Studio · 8 × 6 m", width: 8, depth: 6 },
  { label: "1-bed flat · 10 × 8 m", width: 10, depth: 8 },
  { label: "2-bed flat · 14 × 10 m", width: 14, depth: 10 },
  { label: "Family house · 20 × 15 m", width: 20, depth: 15 },
  { label: "Large estate · 30 × 20 m", width: 30, depth: 20 },
];

const GIZMOS: { mode: GizmoMode; label: string; icon: string }[] = [
  { mode: "translate", label: "Move", icon: "move" },
  { mode: "rotate", label: "Rotate", icon: "rotate" },
  { mode: "scale", label: "Scale", icon: "scale" },
];

function CanvasSizePopover({ bounds, onChange }: { bounds?: CanvasBounds; onChange?: (b: CanvasBounds) => void }) {
  const [open, setOpen] = useState(false);
  const width = bounds?.widthM ?? 16, depth = bounds?.depthM ?? 12;
  const [draftW, setDraftW] = useState(String(width));
  const [draftD, setDraftD] = useState(String(depth));
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { setDraftW(String(width)); setDraftD(String(depth)); }, [width, depth]);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  const apply = (w: number, d: number) => {
    if (!onChange) return;
    const cw = Math.max(2, Math.min(100, Number.isFinite(w) ? w : width));
    const cd = Math.max(2, Math.min(100, Number.isFinite(d) ? d : depth));
    if (cw === width && cd === depth) { setDraftW(String(width)); setDraftD(String(depth)); return; }
    onChange({ widthM: cw, depthM: cd, gridStep: bounds?.gridStep ?? 0.1 });
  };
  return (
    <div className="sk-popover-anchor" ref={ref}>
      <button
        type="button"
        className={`sk-opt-btn${open ? " active" : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Canvas size ${width} × ${depth} m`}
        title="Canvas size"
        onClick={() => setOpen((v) => !v)}
      >
        <SkIcon name="ruler" size={16} />
        <span>{width} × {depth} m</span>
      </button>
      {open && (
        <div className="sk-popover" role="dialog" aria-label="Canvas size">
          <p className="sk-overlay-title">Canvas size</p>
          <div className="sk-preset-list">
            {CANVAS_PRESETS.map((p) => (
              <button
                type="button"
                key={p.label}
                className={p.width === width && p.depth === depth ? "active" : ""}
                onClick={() => apply(p.width, p.depth)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <form
            className="sk-popover-fields"
            onSubmit={(e) => { e.preventDefault(); apply(parseFloat(draftW), parseFloat(draftD)); }}
          >
            <label>Width<span><input aria-label="Canvas width in metres" type="number" min={2} max={100} step={1} value={draftW} onChange={(e) => setDraftW(e.target.value)} onBlur={() => apply(parseFloat(draftW), parseFloat(draftD))} />m</span></label>
            <label>Depth<span><input aria-label="Canvas depth in metres" type="number" min={2} max={100} step={1} value={draftD} onChange={(e) => setDraftD(e.target.value)} onBlur={() => apply(parseFloat(draftW), parseFloat(draftD))} />m</span></label>
            <button type="submit" hidden>Apply</button>
          </form>
          <small>2–100 m. The canvas cannot shrink below existing geometry.</small>
        </div>
      )}
    </div>
  );
}

export function SketchToolbar({
  activeTool,
  activeView,
  orthogonalLock,
  canUndo,
  canRedo,
  isRecording,
  canvasBounds,
  floors = [],
  activeFloorId,
  gizmoMode = "translate",
  onView,
  onOrthogonalLock,
  onUndo,
  onRedo,
  onClear,
  onLengthInput,
  onCanvasBoundsChange,
  onSelectFloor,
  onAddFloor,
  onDeleteFloor,
  onGizmoModeChange,
  children,
}: Props) {
  const [length, setLength] = useState("");
  useEffect(() => { if (activeTool !== "wall") { setLength(""); onLengthInput(null); } }, [activeTool, onLengthInput]);

  return (
    <div className="sk-optbar" role="toolbar" aria-label="Plan options">
      {/* Floors */}
      {floors.length > 0 && onSelectFloor && (
        <div className="sk-opt-group" role="group" aria-label="Floors">
          <SkIcon name="layers" size={16} />
          <div className="sk-floor-tabs">
            {floors.map((fl) => {
              const isActive = fl.id === activeFloorId;
              return (
                <div key={fl.id} className={`sk-floor-tab${isActive ? " active" : ""}`}>
                  <button type="button" onClick={() => onSelectFloor(fl.id)} aria-pressed={isActive}>
                    {fl.name}
                    <small>+{fl.elevationM.toFixed(1)}m</small>
                  </button>
                  {floors.length > 1 && onDeleteFloor && (
                    <button
                      type="button"
                      className="sk-floor-del"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete floor "${fl.name}"? You can undo this.`)) onDeleteFloor(fl.id);
                      }}
                      title={`Delete floor ${fl.name}`}
                      aria-label={`Delete floor ${fl.name}`}
                    >
                      <SkIcon name="close" size={11} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {onAddFloor && (
            <button type="button" className="sk-opt-icon" onClick={onAddFloor} title="Add floor level" aria-label="Add new floor level">
              <SkIcon name="plus" size={15} />
            </button>
          )}
        </div>
      )}

      {/* Views */}
      <div className="sk-segmented" role="group" aria-label="View">
        {VIEWS.map((v) => (
          <button
            key={v.mode}
            type="button"
            className={activeView === v.mode ? "active" : ""}
            title={v.label}
            aria-label={v.label}
            aria-pressed={activeView === v.mode}
            onClick={() => onView(v.mode)}
          >
            <SkIcon name={v.mode} size={15} />
            <span>{v.short}</span>
          </button>
        ))}
      </div>

      {/* Contextual options */}
      {activeView !== "top" && onGizmoModeChange && (
        <div className="sk-segmented" role="group" aria-label="3D gizmo">
          {GIZMOS.map((g) => (
            <button
              key={g.mode}
              type="button"
              className={gizmoMode === g.mode ? "active" : ""}
              onClick={() => onGizmoModeChange(g.mode)}
              title={`${g.label} selected object`}
              aria-label={`${g.label === "Move" ? "Translate" : g.label} gizmo`}
              aria-pressed={gizmoMode === g.mode}
            >
              <SkIcon name={g.icon} size={15} />
              <span>{g.label}</span>
            </button>
          ))}
        </div>
      )}

      {activeTool === "wall" && activeView === "top" && (
        <div className="sk-opt-group sk-wall-opts" role="group" aria-label="Wall options">
          <label className="sk-switch">
            <input
              type="checkbox"
              checked={orthogonalLock}
              onChange={(e) => onOrthogonalLock(e.target.checked)}
              aria-label="Orthogonal lock — hold Shift for temporary"
            />
            <span aria-hidden="true" />
            Straight walls
          </label>
          <label className="sk-inline-field" title="Type a length, then click to place a wall of exactly that length">
            Length
            <input
              type="number"
              placeholder="free"
              min="0.1"
              step="0.1"
              value={length}
              aria-label="Typed wall length in metres"
              onChange={(e) => {
                setLength(e.target.value);
                const v = parseFloat(e.target.value);
                onLengthInput(isNaN(v) || v <= 0 ? null : v);
              }}
            />
            m
          </label>
        </div>
      )}

      {children}

      <span className="sk-opt-spacer" />

      {isRecording && (
        <span className="sk-recording-badge" aria-live="polite"><span className="sk-rec-dot" /> REC</span>
      )}

      <CanvasSizePopover bounds={canvasBounds} onChange={onCanvasBoundsChange} />

      <div className="sk-opt-group" role="group" aria-label="History">
        <button type="button" className="sk-opt-icon" disabled={!canUndo} aria-label="Undo (Ctrl+Z)" title="Undo (Ctrl+Z)" onClick={onUndo}>
          <SkIcon name="undo" size={17} />
        </button>
        <button type="button" className="sk-opt-icon" disabled={!canRedo} aria-label="Redo (Ctrl+Shift+Z)" title="Redo (Ctrl+Shift+Z)" onClick={onRedo}>
          <SkIcon name="redo" size={17} />
        </button>
        <button
          type="button"
          className="sk-opt-icon sk-danger"
          aria-label="Clear all — reset scene"
          title="Clear this floor (can be undone)"
          onClick={() => { if (window.confirm("Clear everything on this floor? You can undo this.")) onClear(); }}
        >
          <SkIcon name="trash" size={17} />
        </button>
      </div>
    </div>
  );
}
