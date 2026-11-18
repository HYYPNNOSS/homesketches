"use client";
import { useState, type FormEvent } from "react";
import type { SketchEngine } from "./engine";
import type { SelectedObject } from "./selection";
import { SkIcon } from "./icons";

export function SelectionBar({ engine, objects, canPaste }: { engine: SketchEngine | null; objects: SelectedObject[]; canPaste: boolean }) {
  const [dx, setDx] = useState(0.5), [dz, setDz] = useState(0.5);
  const none = !objects.length;
  function move(e: FormEvent) { e.preventDefault(); engine?.moveSelection(dx, dz); }
  return (
    <div className={`sk-selection-bar${none ? " empty" : ""}`} aria-label="Selection actions" role="group">
      <span className="sk-sel-count" role="status" aria-label="Selected object count">{objects.length} selected</span>
      {none && !canPaste ? null : <>
      <span className="sk-sel-sep" aria-hidden="true" />
      <button type="button" disabled={none} onClick={() => engine?.copySelection()} title="Copy (Ctrl/Cmd+C)" aria-label="Copy"><SkIcon name="copy" size={15} /><span>Copy</span></button>
      <button type="button" disabled={!canPaste} onClick={() => engine?.pasteSelection()} title="Paste (Ctrl/Cmd+V)" aria-label="Paste"><SkIcon name="paste" size={15} /><span>Paste</span></button>
      <button type="button" disabled={none} onClick={() => engine?.duplicateSelection()} title="Duplicate (Ctrl/Cmd+D)" aria-label="Duplicate"><SkIcon name="duplicate" size={15} /><span>Duplicate</span></button>
      <button type="button" className="sk-danger" disabled={none} onClick={() => engine?.deleteSelected()} title="Delete (Del)" aria-label="Delete selection"><SkIcon name="trash" size={15} /><span>Delete</span></button>
      <span className="sk-sel-sep" aria-hidden="true" />
      <form onSubmit={move} title="Move the selection by an exact distance">
        <label>ΔX<input aria-label="Move selection X" type="number" step={0.1} value={dx} onChange={(e) => setDx(+e.target.value)} /></label>
        <label>ΔZ<input aria-label="Move selection Z" type="number" step={0.1} value={dz} onChange={(e) => setDz(+e.target.value)} /></label>
        <button disabled={none} aria-label="Move selection"><SkIcon name="move" size={15} /><span>Move</span></button>
      </form>
      </>}
    </div>
  );
}
