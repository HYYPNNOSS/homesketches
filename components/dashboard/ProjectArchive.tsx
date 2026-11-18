"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { deleteProject, listProjects, listDesigns, saveDesign, type SavedDesign, type SavedProject } from "../../lib/workspace-store";
import { ResultViewer } from "./ResultViewer";

export function ProjectArchive({ limit }: { limit?: number }) {
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<SavedProject | null>(null);
  const load = useCallback(async () => {
    try { const [results, editable] = await Promise.all([listProjects(), listDesigns()]); setProjects(results); setDesigns(editable); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load projects."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void load();
    window.addEventListener("workspace-updated", load);
    return () => window.removeEventListener("workspace-updated", load);
  }, [load]);
  async function remove(id: string) {
    try { await deleteProject(id); if (selected?.id === id) setSelected(null); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not delete project."); }
  }
  async function editSource(project: SavedProject) {
    if (!project.design) return;
    try { const design = structuredClone(project.design); design.id = crypto.randomUUID(); design.name = `${design.name ?? "Design"} source copy`; await saveDesign(design); window.location.href = `/dashboard/sketch?design=${design.id}`; }
    catch { setError("Could not reopen the source design. Browser storage may be full."); }
  }
  return <>
    {!!designs.length && <section aria-label="Editable designs"><h3>Editable designs</h3><div className="project-list">{designs.slice(0,limit).map(design => <article className="project-row" key={design.id}><div className="project-info"><strong>{design.name}</strong><span>{design.project.floors.length} floor(s) · {new Date(design.updatedAt).toLocaleDateString()}</span></div><Link className="text-action" href={`/dashboard/sketch?design=${design.id}`}>Edit design ↗</Link></article>)}</div></section>}
    <p className="studio-notice">Saved in this browser. Download important results to keep a copy.</p>
    {error && <p role="alert" className="generation-error">{error} <button onClick={load}>Retry</button></p>}
    {loading && <p role="status" className="empty-state">Loading your projects…</p>}
    {!loading && !error && !projects.length && <p className="empty-state">No saved results yet. <Link href="/dashboard/text-to-sketch">Create your first render ↗</Link></p>}
    <div className="project-list">{projects.slice(0, limit).map(project => <article className="project-row" key={project.id}>
      <div className="project-info"><strong>{project.name}</strong><span>{project.kind} · {new Date(project.createdAt).toLocaleDateString()}</span></div>
      <button className="text-action" onClick={() => setSelected(project)}>Open ↗</button>
      <button className="text-action" aria-label={`Delete ${project.name}`} onClick={() => remove(project.id)}>Delete</button>
    </article>)}</div>
    {selected && <section className="archive-preview" aria-label={selected.name}>
      <div className="section-heading"><h3>{selected.name}</h3><button className="text-action" onClick={() => setSelected(null)}>Close ×</button></div>
      {selected.kind === "render" ? <img className="archive-image" src={selected.url} alt={selected.name} /> : <ResultViewer kind={selected.kind} url={selected.url} />}
      {selected.design && <button className="subpage-action" onClick={() => editSource(selected)}>Edit source copy ↗</button>}
      <a className="subpage-action" href={selected.url} download target="_blank" rel="noreferrer">Download / open result ↗</a>
    </section>}
  </>;
}
