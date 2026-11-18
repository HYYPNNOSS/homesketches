"use client";
import { useEffect, useState, type FormEvent } from "react";
import type { Room } from "./types";
export function RoomProperties({ room, onUpdate, onDelete }: { room: Room; onUpdate: (updates: Partial<Room>) => void; onDelete: () => void }) {
  const [name, setName] = useState(room.name), [width, setWidth] = useState(room.w), [depth, setDepth] = useState(room.d);
  const [error, setError] = useState("");
  useEffect(() => { setName(room.name); setWidth(room.w); setDepth(room.d); setError(""); }, [room.id, room.name, room.w, room.d]);
  function save(e: FormEvent) { e.preventDefault(); try { onUpdate({ name: name.trim() || "Room", w: width, d: depth }); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Could not resize room."); } }
  return <section className="sk-room-inspector" aria-label="Room properties"><h2>Room properties</h2><form onSubmit={save}><label>Room name<input aria-label="Room name" value={name} maxLength={80} onChange={e => setName(e.target.value)} /></label><label>Width (m)<input aria-label="Room width" type="number" min={.2} step={.1} value={width} onChange={e => setWidth(+e.target.value)} required /></label><label>Depth (m)<input aria-label="Room depth" type="number" min={.2} step={.1} value={depth} onChange={e => setDepth(+e.target.value)} required /></label><p>Area: {(width * depth).toFixed(2)} m²</p><p>Resizing moves walls at this room’s boundary and keeps their openings attached. Check adjoining rooms after resizing shared walls.</p>{error && <p role="alert">{error}</p>}<button type="submit">Apply room changes</button><button type="button" onClick={onDelete}>Delete room and contents</button></form></section>;
}
