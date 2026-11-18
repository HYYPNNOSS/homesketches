"use client";
import { useEffect, useState, type FormEvent } from "react";
import type { Room } from "./types";
import { SkIcon } from "./icons";

export function RoomProperties({ room, onUpdate, onDelete, onDismiss }: { room: Room; onUpdate: (updates: Partial<Room>) => void; onDelete: () => void; onDismiss?: () => void }) {
  const [name, setName] = useState(room.name), [width, setWidth] = useState(room.w), [depth, setDepth] = useState(room.d);
  const [error, setError] = useState("");
  useEffect(() => { setName(room.name); setWidth(room.w); setDepth(room.d); setError(""); }, [room.id, room.name, room.w, room.d]);
  const dirty = name.trim() !== room.name || width !== room.w || depth !== room.d;
  function save(e: FormEvent) { e.preventDefault(); try { onUpdate({ name: name.trim() || "Room", w: width, d: depth }); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Could not resize room."); } }
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
