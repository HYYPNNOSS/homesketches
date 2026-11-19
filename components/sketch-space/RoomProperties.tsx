"use client";
import { useEffect, useState, type FormEvent } from "react";
import type { Room } from "./types";
import { SkIcon } from "./icons";

export function RoomProperties({ room, onUpdate, onMove, onDelete, onDismiss }: { room: Room; onUpdate: (updates: Partial<Room>) => void; onMove?: (dx: number, dz: number) => void; onDelete: () => void; onDismiss?: () => void }) {
  const [name, setName] = useState(room.name), [width, setWidth] = useState(room.w), [depth, setDepth] = useState(room.d);
  const [x, setX] = useState(room.x), [z, setZ] = useState(room.z);
  const [error, setError] = useState("");
  useEffect(() => { setName(room.name); setWidth(room.w); setDepth(room.d); setX(room.x); setZ(room.z); setError(""); }, [room.id, room.name, room.w, room.d, room.x, room.z]);
  const moved = Math.abs(x - room.x) > 1e-6 || Math.abs(z - room.z) > 1e-6;
  const dirty = name.trim() !== room.name || width !== room.w || depth !== room.d || moved;
  function save(e: FormEvent) {
    e.preventDefault();
    try {
      if (name.trim() !== room.name || width !== room.w || depth !== room.d) onUpdate({ name: name.trim() || "Room", w: width, d: depth });
      if (moved && onMove && Number.isFinite(x) && Number.isFinite(z)) onMove(x - room.x, z - room.z);
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not resize room."); }
  }
  return (
    <section className="sk-ctx sk-room-inspector" aria-label="Room properties">
      <header className="sk-ctx-header">
        <span className="sk-ctx-icon"><SkIcon name="room" size={16} /></span>
        <h2 className="sk-ctx-title">Room properties<small>{(room.w * room.d).toFixed(2)} m²</small></h2>
        {onDismiss && <button type="button" className="sk-ctx-close" onClick={onDismiss} aria-label="Dismiss inspector" title="Close inspector (Esc)"><SkIcon name="close" size={14} /></button>}
      </header>
      <form onSubmit={save} className="sk-ctx-body">
        <label className="sk-insp-field"><span>Room name</span><input aria-label="Room name" value={name} maxLength={80} onChange={e => setName(e.target.value)} /></label>
        <div className="sk-insp-grid">
          <label className="sk-insp-field"><span>Width</span><span className="sk-insp-input"><input aria-label="Room width" type="number" min={.2} step={.1} value={width} onChange={e => setWidth(+e.target.value)} required /><em>m</em></span></label>
          <label className="sk-insp-field"><span>Depth</span><span className="sk-insp-input"><input aria-label="Room depth" type="number" min={.2} step={.1} value={depth} onChange={e => setDepth(+e.target.value)} required /><em>m</em></span></label>
        </div>
        {onMove && <div className="sk-insp-grid">
          <label className="sk-insp-field"><span>X (west edge)</span><span className="sk-insp-input"><input aria-label="Room X" type="number" step={.05} value={x} onChange={e => setX(+e.target.value)} required /><em>m</em></span></label>
          <label className="sk-insp-field"><span>Z (north edge)</span><span className="sk-insp-input"><input aria-label="Room Z" type="number" step={.05} value={z} onChange={e => setZ(+e.target.value)} required /><em>m</em></span></label>
        </div>}
        <p className="sk-insp-note">Area after changes: <strong>{(width * depth).toFixed(2)} m²</strong>. Walls on the room boundary move with it; check neighbouring rooms after resizing shared walls.</p>
        {error && <p role="alert" className="sk-project-error">{error}</p>}
        <div className="sk-ctx-actions">
          <button type="submit" className="sk-ctx-btn sk-ctx-primary" disabled={!dirty}>Apply room changes</button>
          <button type="button" className="sk-ctx-btn sk-ctx-danger" onClick={onDelete}><SkIcon name="trash" size={15} /> Delete room and contents</button>
        </div>
      </form>
    </section>
  );
}
