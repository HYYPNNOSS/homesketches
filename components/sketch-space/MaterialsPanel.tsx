"use client";
import { useEffect, useMemo, useState } from "react";
import type { SketchEngine } from "./engine";
import { materialThumbnail } from "./material-library";
import { BUILTIN_MATERIALS, type CustomMaterial, type Scene } from "./types";

type Target =
  | { kind: "room-floor" | "room-walls" | "wall"; id: string }
  | { kind: "all-floors" | "all-walls" };

const targetKey = (t: Target) => ("id" in t ? `${t.kind}:${t.id}` : t.kind);
const isWallTarget = (t: Target) => t.kind === "room-walls" || t.kind === "wall" || t.kind === "all-walls";

/** Downscale an image file to ≤ max px and re-encode it so projects stay small. */
async function compressImage(file: File, max = 1024): Promise<string> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error("Use PNG, JPG or WEBP images.");
  if (file.size > 25 * 1024 * 1024) throw new Error("Images must be smaller than 25MB.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const webp = canvas.toDataURL("image/webp", 0.9);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.9);
}

function Swatch({ id, name, image, color, active, onPick, onRemove }: { id: string; name: string; image?: string; color?: string; active: boolean; onPick: () => void; onRemove?: () => void }) {
  return (
    <div className={`sk-mat${active ? " active" : ""}`}>
      <button type="button" className="sk-mat-pick" onClick={onPick} aria-pressed={active} title={name} data-material={id}>
        <span className="sk-mat-thumb" style={{ backgroundImage: image ? `url(${image})` : undefined, backgroundColor: color ?? "#ddd" }} />
        <span className="sk-mat-name">{name}</span>
      </button>
      {onRemove && <button type="button" className="sk-mat-remove" onClick={onRemove} aria-label={`Delete material ${name}`} title="Delete material">×</button>}
    </div>
  );
}

export function MaterialsPanel({ engine, scene, materials, selectedWallId, selectedRoomId }: {
  engine: SketchEngine | null;
  scene: Scene | null | undefined;
  materials: CustomMaterial[];
  selectedWallId?: string;
  selectedRoomId?: string;
}) {
  const rooms = useMemo(() => scene?.rooms ?? [], [scene]);
  const targets = useMemo(() => {
    const list: Array<{ target: Target; label: string }> = [];
    if (selectedWallId) list.push({ target: { kind: "wall", id: selectedWallId }, label: "Selected wall" });
    for (const r of rooms) list.push({ target: { kind: "room-floor", id: r.id }, label: `${r.name} — floor` }, { target: { kind: "room-walls", id: r.id }, label: `${r.name} — walls` });
    if (rooms.length) list.push({ target: { kind: "all-floors" }, label: "All floors on this level" });
    if (scene?.walls.length) list.push({ target: { kind: "all-walls" }, label: "All walls on this level" });
    return list;
  }, [rooms, scene?.walls.length, selectedWallId]);

  const [key, setKey] = useState("");
  useEffect(() => {
    const preferred = selectedWallId ? `wall:${selectedWallId}` : selectedRoomId ? `room-floor:${selectedRoomId}` : "";
    if (preferred && targets.some(t => targetKey(t.target) === preferred)) setKey(preferred);
    else if (!targets.some(t => targetKey(t.target) === key)) setKey(targets[0] ? targetKey(targets[0].target) : "");
  }, [targets, selectedWallId, selectedRoomId]); // eslint-disable-line react-hooks/exhaustive-deps
  const target = targets.find(t => targetKey(t.target) === key)?.target;

  const current = useMemo(() => {
    if (!target || !scene) return undefined;
    if (target.kind === "room-floor") return scene.rooms.find(r => r.id === target.id)?.materialId;
    if (target.kind === "room-walls") return scene.rooms.find(r => r.id === target.id)?.wallMaterialId;
    if (target.kind === "wall") return scene.walls.find(w => w.id === target.id)?.materialId;
    return undefined;
  }, [target, scene]);

  // Thumbnails are generated lazily after mount (client-only canvas work).
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false, i = 0;
    const step = () => {
      if (cancelled || i >= BUILTIN_MATERIALS.length) return;
      const m = BUILTIN_MATERIALS[i++];
      const url = materialThumbnail(m.id);
      setThumbs(t => ({ ...t, [m.id]: url }));
      setTimeout(step, 0);
    };
    step();
    return () => { cancelled = true; };
  }, []);

  const [error, setError] = useState("");
  const apply = (id: string | undefined) => {
    if (!engine || !target) return;
    try { engine.applyMaterial(target, id); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Could not apply material."); }
  };

  // Import form
  const [name, setName] = useState("");
  const [tileM, setTileM] = useState(1);
  const [rough, setRough] = useState(0.6);
  const [metal, setMetal] = useState(0);
  const [files, setFiles] = useState<{ albedo?: File; normal?: File; roughness?: File }>({});
  const [busy, setBusy] = useState(false);
  async function importMaterial() {
    if (!engine || !files.albedo) return;
    setBusy(true); setError("");
    try {
      const [albedo, normal, roughnessMap] = await Promise.all([compressImage(files.albedo), files.normal ? compressImage(files.normal) : undefined, files.roughness ? compressImage(files.roughness) : undefined]);
      const id = `custom-${crypto.randomUUID().slice(0, 8)}`;
      const material: CustomMaterial = { id, name: (name.trim() || files.albedo.name.replace(/\.\w+$/, "")).slice(0, 80), category: target && isWallTarget(target) ? "wall" : "floor", albedo, normal, roughnessMap, tileM: Math.max(0.05, Math.min(20, tileM || 1)), roughness: rough, metalness: metal };
      engine.upsertMaterial(material);
      if (target) engine.applyMaterial(target, id);
      setFiles({}); setName("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not import that texture."); }
    finally { setBusy(false); }
  }

  if (!targets.length) return (
    <div className="sk-panel-section">
      <div className="sk-panel-heading"><span className="sk-panel-eyebrow">Finishes</span><h2 className="sk-panel-title">Materials</h2></div>
      <p className="sk-mat-hint">Draw a room or a wall first, then come back to apply realistic floor and wall finishes.</p>
    </div>
  );

  const wallMode = target ? isWallTarget(target) : false;
  const builtins = BUILTIN_MATERIALS.filter(m => m.category === "any" || m.category === (wallMode ? "wall" : "floor"));
  const others = BUILTIN_MATERIALS.filter(m => !builtins.includes(m));
  return (
    <div className="sk-panel-section">
      <div className="sk-panel-heading"><span className="sk-panel-eyebrow">Finishes</span><h2 className="sk-panel-title">Materials</h2></div>
      <label className="sk-field-label">Apply to
        <select className="sk-select" value={key} onChange={e => setKey(e.target.value)} aria-label="Material target">
          {targets.map(t => <option key={targetKey(t.target)} value={targetKey(t.target)}>{t.label}</option>)}
        </select>
      </label>

      <div className="sk-mat-grid" role="group" aria-label={wallMode ? "Wall finishes" : "Floor finishes"}>
        <Swatch id="default" name="Default" color={wallMode ? "#3d4234" : "#e8edcf"} active={!current} onPick={() => apply(undefined)} />
        {materials.map(m => <Swatch key={m.id} id={m.id} name={m.name} image={m.albedo} color={m.color} active={current === m.id} onPick={() => apply(m.id)} onRemove={() => { if (window.confirm(`Delete “${m.name}”? Surfaces using it go back to default.`)) engine?.removeMaterial(m.id); }} />)}
        {builtins.map(m => <Swatch key={m.id} id={m.id} name={m.name} image={thumbs[m.id]} color={m.previewColor} active={current === m.id} onPick={() => apply(m.id)} />)}
      </div>
      <details className="sk-mat-more">
        <summary>More {wallMode ? "floor" : "wall"} finishes</summary>
        <div className="sk-mat-grid">{others.map(m => <Swatch key={m.id} id={m.id} name={m.name} image={thumbs[m.id]} color={m.previewColor} active={current === m.id} onPick={() => apply(m.id)} />)}</div>
      </details>
      <p className="sk-mat-hint">Textures are physically based (colour, relief and gloss) and drawn at real-world scale. Switch to 3D to see them lit.</p>

      <details className="sk-mat-import" open={!!files.albedo}>
        <summary>Import your own texture</summary>
        <label className="sk-field-label">Name<input className="sk-select" value={name} maxLength={80} onChange={e => setName(e.target.value)} placeholder="e.g. Smoked oak" /></label>
        <label className="sk-field-label">Colour map (required)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setFiles(f => ({ ...f, albedo: e.target.files?.[0] }))} aria-label="Colour texture image" /></label>
        <label className="sk-field-label">Normal map (optional)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setFiles(f => ({ ...f, normal: e.target.files?.[0] }))} aria-label="Normal map image" /></label>
        <label className="sk-field-label">Roughness map (optional)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setFiles(f => ({ ...f, roughness: e.target.files?.[0] }))} aria-label="Roughness map image" /></label>
        <div className="sk-insp-grid">
          <label className="sk-field-label">Real width of image (m)<input className="sk-select" type="number" min={0.05} max={20} step={0.05} value={tileM} onChange={e => setTileM(+e.target.value)} aria-label="Real-world texture size in metres" /></label>
          <label className="sk-field-label">Roughness {rough.toFixed(2)}<input type="range" min={0} max={1} step={0.05} value={rough} onChange={e => setRough(+e.target.value)} aria-label="Roughness" /></label>
          <label className="sk-field-label">Metalness {metal.toFixed(2)}<input type="range" min={0} max={1} step={0.05} value={metal} onChange={e => setMetal(+e.target.value)} aria-label="Metalness" /></label>
        </div>
        <p className="sk-mat-hint">Tip: download free PBR sets (colour, normal “GL”, roughness) from ambientCG or Poly Haven. Set the real width the photo covers, e.g. 2 m for a plank set.</p>
        <button type="button" className="sk-render-btn" style={{ width: "100%" }} disabled={!files.albedo || busy || !engine} onClick={importMaterial}>{busy ? "Importing…" : "Import and apply"}</button>
      </details>
      {error && <p role="alert" className="sk-project-error">{error}</p>}
    </div>
  );
}
