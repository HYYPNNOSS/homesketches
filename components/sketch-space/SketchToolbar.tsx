"use client";

import { FurnitureKind, ToolKind, ViewMode, FURNITURE_SIZES } from "./types";

interface Props {
  activeTool: ToolKind;
  activeView: ViewMode;
  activeFurniture: FurnitureKind;
  orthogonalLock: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isRecording: boolean;
  onTool: (t: ToolKind) => void;
  onView: (v: ViewMode) => void;
  onFurniture: (f: FurnitureKind) => void;
  onOrthogonalLock: (v: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onLengthInput: (metres: number | null) => void;
}

const TOOLS: { kind: ToolKind; label: string; icon: string; shortcut: string }[] = [
  { kind: "select", label: "Select", icon: "↖", shortcut: "V" },
  { kind: "wall", label: "Wall", icon: "┐", shortcut: "W" },
  { kind: "room", label: "Room rect", icon: "□", shortcut: "R" },
  { kind: "door", label: "Door", icon: "⌐", shortcut: "D" },
  { kind: "window", label: "Window", icon: "⊡", shortcut: "N" },
  { kind: "furniture", label: "Furniture", icon: "⊞", shortcut: "F" },
  { kind: "label", label: "Label", icon: "T", shortcut: "L" },
  { kind: "eraser", label: "Erase", icon: "⌫", shortcut: "E" },
];

const FURNITURE_LIST: FurnitureKind[] = [
  "bed", "sofa", "table", "kitchen", "toilet", "bath", "stairs",
  "plant", "tv", "rug", "chair", "wardrobe"
];

const VIEWS: { mode: ViewMode; label: string; icon: string }[] = [
  { mode: "top", label: "Top-down", icon: "⊙" },
  { mode: "perspective", label: "Perspective", icon: "⧫" },
  { mode: "eye-level", label: "Eye level", icon: "◎" },
];

export function SketchToolbar({
  activeTool,
  activeView,
  activeFurniture,
  orthogonalLock,
  canUndo,
  canRedo,
  isRecording,
  onTool,
  onView,
  onFurniture,
  onOrthogonalLock,
  onUndo,
  onRedo,
  onClear,
  onLengthInput,
}: Props) {
  return (
    <div className="sk-toolbar" role="toolbar" aria-label="Drawing tools">
      {/* View modes */}
      <div className="sk-toolbar-section">
        <span className="sk-toolbar-label">View</span>
        <div className="sk-toolbar-group">
          {VIEWS.map((v) => (
            <button
              key={v.mode}
              type="button"
              className={`sk-tool-btn ${activeView === v.mode ? "active" : ""}`}
              title={v.label}
              aria-label={v.label}
              aria-pressed={activeView === v.mode}
              onClick={() => onView(v.mode)}
            >
              <span className="sk-tool-icon">{v.icon}</span>
              <span className="sk-tool-name">{v.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="sk-toolbar-divider" aria-hidden="true" />

      {/* Drawing tools */}
      <div className="sk-toolbar-section">
        <span className="sk-toolbar-label">Draw</span>
        <div className="sk-toolbar-group">
          {TOOLS.map((t) => (
            <button
              key={t.kind}
              type="button"
              className={`sk-tool-btn ${activeTool === t.kind ? "active" : ""}`}
              title={`${t.label} (${t.shortcut})`}
              aria-label={`${t.label}, shortcut ${t.shortcut}`}
              aria-pressed={activeTool === t.kind}
              onClick={() => onTool(t.kind)}
            >
              <span className="sk-tool-icon">{t.icon}</span>
              <span className="sk-tool-name">{t.label}</span>
              <kbd className="sk-shortcut">{t.shortcut}</kbd>
            </button>
          ))}
        </div>
      </div>

      {/* Furniture sub-picker — visible when furniture tool active */}
      {activeTool === "furniture" && (
        <>
          <div className="sk-toolbar-divider" aria-hidden="true" />
          <div className="sk-toolbar-section">
            <span className="sk-toolbar-label">Furniture</span>
            <div className="sk-toolbar-group sk-furniture-group">
              {FURNITURE_LIST.map((kind) => {
                const [w, d] = FURNITURE_SIZES[kind];
                return (
                  <button
                    key={kind}
                    type="button"
                    className={`sk-tool-btn sk-furn-btn ${activeFurniture === kind ? "active" : ""}`}
                    aria-label={`${kind} ${w}×${d}m`}
                    aria-pressed={activeFurniture === kind}
                    onClick={() => onFurniture(kind)}
                  >
                    <span className="sk-tool-name">{kind}</span>
                    <span className="sk-furn-size">{w}×{d}m</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Wall options — visible when wall tool active */}
      {activeTool === "wall" && (
        <>
          <div className="sk-toolbar-divider" aria-hidden="true" />
          <div className="sk-toolbar-section">
            <span className="sk-toolbar-label">Wall options</span>
            <label className="sk-ortho-label">
              <input
                type="checkbox"
                checked={orthogonalLock}
                onChange={(e) => onOrthogonalLock(e.target.checked)}
                aria-label="Orthogonal lock — hold Shift for temporary"
              />
              <span>Orthogonal lock</span>
              <kbd className="sk-shortcut">⇧</kbd>
            </label>
            <label className="sk-len-label">
              Length (m)
              <input
                type="number"
                className="sk-len-input"
                placeholder="auto"
                min="0.1"
                step="0.1"
                aria-label="Typed wall length in metres"
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  onLengthInput(isNaN(v) || v <= 0 ? null : v);
                }}
              />
            </label>
          </div>
        </>
      )}

      <div className="sk-toolbar-divider" aria-hidden="true" />

      {/* History */}
      <div className="sk-toolbar-section">
        <span className="sk-toolbar-label">History</span>
        <div className="sk-toolbar-group">
          <button
            type="button"
            className="sk-tool-btn"
            disabled={!canUndo}
            aria-label="Undo (Ctrl+Z)"
            title="Undo (Ctrl+Z)"
            onClick={onUndo}
          >
            <span className="sk-tool-icon">↩</span>
            <span className="sk-tool-name">Undo</span>
          </button>
          <button
            type="button"
            className="sk-tool-btn"
            disabled={!canRedo}
            aria-label="Redo (Ctrl+Shift+Z)"
            title="Redo (Ctrl+Shift+Z)"
            onClick={onRedo}
          >
            <span className="sk-tool-icon">↪</span>
            <span className="sk-tool-name">Redo</span>
          </button>
          <button
            type="button"
            className="sk-tool-btn sk-tool-danger"
            aria-label="Clear all — reset scene"
            title="Clear all"
            onClick={() => {
              if (window.confirm("Clear the entire scene?")) onClear();
            }}
          >
            <span className="sk-tool-icon">✕</span>
            <span className="sk-tool-name">Clear</span>
          </button>
        </div>
      </div>

      {isRecording && (
        <div className="sk-recording-badge" aria-live="polite">
          <span className="sk-rec-dot" /> REC
        </div>
      )}
    </div>
  );
}
