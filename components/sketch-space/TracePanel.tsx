"use client";
import { useEffect, useState } from "react";
import type { SketchEngine } from "./engine";
import type { TraceReference, Vec2 } from "./types";
import { SkIcon } from "./icons";

export function TracePanel({ engine, reference }: { engine: SketchEngine | null; reference?: TraceReference }) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [points, setPoints] = useState<Vec2[] | null>(null), [metres, setMetres] = useState(1), [opacity, setOpacity] = useState(reference?.opacity ?? 0.45);
  useEffect(() => { setOpacity(reference?.opacity ?? 0.45); }, [reference?.opacity]);
  useEffect(() => { const off = engine?.on("calibration-change", (data) => { setPoints(data as Vec2[] | null); setOpen(true); }); return () => { off?.(); }; }, [engine]);
  function run(action: () => void) { try { action(); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Could not update the reference image."); } }
  async function upload(file?: File) {
    if (!file || !engine) return;
    setError(""); setBusy(true);
    try {
      if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 20 * 1024 * 1024) throw new Error("Choose a JPG, PNG or WEBP smaller than 20MB. Export PDF pages as images first.");
      const bitmap = await createImageBitmap(file);
      try {
        const ratio = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(bitmap.width * ratio)); canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
        const context = canvas.getContext("2d"); if (!context) throw new Error("This browser could not read the image.");
        context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        let dataUrl = canvas.toDataURL("image/png"); if (dataUrl.length > 3_000_000) dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        if (dataUrl.length > 4_000_000) throw new Error("This image is too large to save. Try a smaller image.");
        const bounds = engine.getCanvasBounds(), aspect = bitmap.width / bitmap.height;
        const widthM = Math.min(bounds.widthM * 0.9, bounds.depthM * 0.9 * aspect);
        engine.cancelCalibration(); engine.setReference({ name: file.name, dataUrl, center: [0, 0], widthM, depthM: widthM / aspect, opacity: 0.45, visible: true, calibrated: false }); engine.setView("top"); engine.fitToPlan();
      } finally { bitmap.close(); }
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load this image."); }
    finally { setBusy(false); }
  }
  function change(updates: Partial<TraceReference>) { if (reference) run(() => engine?.setReference({ ...reference, ...updates })); }
  const calibrating = points !== null;
  return (
    <section className={`sk-trace-panel${open || calibrating ? " open" : ""}`} aria-label="Floor plan tracing">
      <div className="sk-trace-heading">
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="sk-trace-toggle">
          <SkIcon name="image" size={15} />
          <span>Trace floor plan</span>
          {reference && <i className={`sk-dot${reference.calibrated ? " ok" : ""}`} aria-hidden="true" />}
          <span aria-hidden="true" className="sk-chev">{open ? "−" : "+"}</span>
        </button>
      </div>
      {open && (
        <div className="sk-trace-body">
          {reference && (
            <p className="sk-trace-meta">
              <strong>{reference.name} · Locked</strong>
              <span>{reference.widthM.toFixed(2)} × {reference.depthM.toFixed(2)} m · {reference.calibrated ? "Calibrated" : "Scale not calibrated"}</span>
            </p>
          )}
          <label className="sk-import-button sk-trace-upload">
            {busy ? "Reading image…" : reference ? "Replace reference image" : "Import reference image"}
            <input aria-label="Reference floor plan image" type="file" accept=".png,.jpg,.jpeg,.webp" disabled={busy || !engine} onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          {reference && (
            <>
              <label className="sk-trace-row">Opacity
                <input aria-label="Reference opacity" type="range" min={0.05} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(+e.target.value)} onPointerUp={() => change({ opacity })} onKeyUp={() => change({ opacity })} onBlur={() => { if (opacity !== reference.opacity) change({ opacity }); }} />
                <output>{Math.round(opacity * 100)}%</output>
              </label>
              <label className="sk-trace-row sk-trace-check"><input aria-label="Show reference image" type="checkbox" checked={reference.visible} onChange={(e) => change({ visible: e.target.checked })} />Show image</label>
              <div className="sk-trace-actions">
                <button type="button" className="sk-primary" disabled={!reference.visible || calibrating} onClick={() => run(() => engine?.startCalibration())}>Calibrate scale</button>
                <button type="button" className="sk-danger" onClick={() => run(() => { engine?.cancelCalibration(); engine?.setReference(undefined); })}>Remove reference</button>
              </div>
            </>
          )}
          <small>The image is locked under your drawing, saved with the project JSON, and left out of renders and SVG/GLB exports.</small>
        </div>
      )}
      {calibrating && (
        <div className="sk-calibration" role="status">
          <ol className="sk-steps">
            <li className={points.length === 0 ? "now" : "done"}>Pick point A</li>
            <li className={points.length === 1 ? "now" : points.length > 1 ? "done" : ""}>Pick point B</li>
            <li className={points.length >= 2 ? "now" : ""}>Enter distance</li>
          </ol>
          {points.length < 2
            ? <strong>{points.length === 0 ? "Click the first measurement point on the image." : "Click the second measurement point on the image."}</strong>
            : (
              <form onSubmit={(e) => { e.preventDefault(); run(() => engine?.applyCalibration(metres)); }}>
                <label>Real distance<span><input aria-label="Calibration distance in metres" type="number" min={0.01} max={1000} step={0.01} required value={metres} onChange={(e) => setMetres(+e.target.value)} autoFocus />m</span></label>
                <button type="submit" className="sk-primary">Apply scale</button>
              </form>
            )}
          <button type="button" className="sk-link" onClick={() => engine?.cancelCalibration()}>Cancel calibration</button>
        </div>
      )}
      {error && <p className="sk-project-error" role="alert">{error}</p>}
    </section>
  );
}
