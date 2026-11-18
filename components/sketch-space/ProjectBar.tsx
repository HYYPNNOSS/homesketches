"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SketchEngine } from "./engine";
import { emptyProject, type Project } from "./types";
import { parseProject } from "./project-data";
import { getDesign, listDesigns, saveDesign, type SavedDesign } from "../../lib/workspace-store";

export function ProjectBar({ engine, onExport }: { engine: SketchEngine | null; onExport: () => void }) {
  const [name, setName] = useState("Untitled Project");
  const [status, setStatus] = useState("Loading design…");
  const [error, setError] = useState("");
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [selected, setSelected] = useState("");
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Promise<void>>(Promise.resolve());
  const snapshot = useRef<Project | null>(null);

  const persist = useCallback((project: Project) => {
    const copy = structuredClone(project);
    const task = pending.current.catch(() => {}).then(() => saveDesign(copy));
    pending.current = task;
    return task;
  }, []);
  useEffect(() => {
    if (!engine) return;
    let active = true;
    const changed = () => {
      const project = structuredClone(engine.getProject()); snapshot.current = project;
      setName(project.name ?? "Untitled Project"); setStatus("Saving…");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        void persist(project).then(() => { if (active) { setStatus("Saved in this browser"); setError(""); } }).catch(() => { if (active) { setStatus("Not saved"); setError("Browser storage is unavailable or full. Export JSON to keep a copy."); } });
      }, 600);
    };
    changed();
    const requested = new URLSearchParams(window.location.search).get("design");
    if (requested) void getDesign(requested).then(async design => {
      if (!active) return;
      if (!design) { setError("This design is no longer saved in this browser."); return; }
      await persist(engine.getProject());
      if (active) engine.setProject(design.project);
    }).catch(() => { if (active) setError("Could not open this design."); });
    const off = engine.on("scene-change", changed);
    const offStatus = engine.on("save-status", message => { if (String(message).includes("could not")) setError(String(message)); });
    const flush = () => { if (timer.current && snapshot.current) { clearTimeout(timer.current); timer.current = null; void persist(snapshot.current).catch(() => {}); } };
    window.addEventListener("pagehide", flush);
    return () => { active = false; off(); offStatus(); flush(); window.removeEventListener("pagehide", flush); };
  }, [engine, persist]);

  async function saveCurrent() {
    if (!engine) return;
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    await persist(engine.getProject()); setStatus("Saved in this browser");
  }
  async function action(run: () => Promise<void>) {
    setBusy(true); setError("");
    try { await saveCurrent(); await run(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not save your design. Export JSON before leaving it."); }
    finally { setBusy(false); }
  }
  async function importFile(file?: File) {
    if (!file || !engine) return;
    if (file.size > 10 * 1024 * 1024) { setError("Project JSON must be smaller than 10MB."); return; }
    // Validate before changing or saving the current project.
    let project: Project;
    try { project = parseProject(JSON.parse(await file.text())); }
    catch (e) { setError(e instanceof SyntaxError ? "This file is not valid JSON." : e instanceof Error ? e.message : "Invalid project file."); return; }
    await action(async () => {
      project.id = crypto.randomUUID(); project.name = project.name ?? file.name.replace(/\.json$/i, "");
      engine.setProject(project); await persist(engine.getProject()); setPicker(false);
    });
  }
  return <div className="sk-project-bar">
    <label className="sk-project-name">Project<input aria-label="Project name" maxLength={80} value={name} disabled={!engine || busy} onChange={e => setName(e.target.value)} onBlur={() => engine?.renameProject(name)} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }} /></label>
    <span className="sk-save-status" role="status">{status}</span>
    <div className="sk-project-actions">
      <button disabled={!engine || busy} onClick={() => action(async () => { const project = emptyProject(); project.id = crypto.randomUUID(); engine?.setProject(project); })}>New</button>
      <button disabled={!engine || busy} aria-expanded={picker} onClick={async () => { try { await saveCurrent(); setDesigns(await listDesigns()); setSelected(engine?.getProject().id ?? ""); setPicker(!picker); } catch { setError("Could not open saved designs. Export JSON to keep your current design."); } }}>Open</button>
      <button disabled={!engine || busy} onClick={() => action(async () => { const copy = structuredClone(engine!.getProject()); copy.id = crypto.randomUUID(); copy.name = `${copy.name ?? "Untitled Project"} copy`.slice(0, 80); engine!.setProject(copy); await persist(engine!.getProject()); })}>Save a copy</button>
      <label className="sk-import-button">Import JSON<input type="file" accept=".json,application/json" disabled={!engine || busy} onChange={e => { void importFile(e.target.files?.[0]); e.target.value = ""; }} /></label>
      <button disabled={!engine} onClick={onExport}>Export JSON</button>
    </div>
    {picker && <div className="sk-project-picker"><label>Saved designs<select aria-label="Saved designs" value={selected} onChange={e => setSelected(e.target.value)}>{designs.map(design => <option value={design.id} key={design.id}>{design.name} · {new Date(design.updatedAt).toLocaleDateString()}</option>)}</select></label><button disabled={!selected || busy} onClick={() => action(async () => { const design = designs.find(d => d.id === selected); if (design) { engine?.setProject(design.project); setPicker(false); } })}>Open design</button><button onClick={() => setPicker(false)}>Close</button></div>}
    {error && <p role="alert" className="sk-project-error">{error}</p>}
  </div>;
}
