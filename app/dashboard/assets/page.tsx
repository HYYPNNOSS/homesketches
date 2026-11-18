"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StudioShell } from "../../../components/dashboard/StudioShell";
import { addAsset, deleteAsset, listAssets, type SavedAsset } from "../../../lib/workspace-store";

export default function AssetsPage() {
  const [files, setFiles] = useState<SavedAsset[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  async function load() {
    try { setFiles(await listAssets()); }
    catch (e) { setNotice(e instanceof Error ? e.message : "Could not load assets."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  async function select(incoming: FileList | null) {
    if (!incoming || busy) return;
    setBusy(true); setNotice("");
    try {
      for (const file of Array.from(incoming)) await addAsset(file);
      setNotice("Assets saved in this browser.");
    } catch (e) { setNotice(e instanceof Error ? e.message : "Could not save assets."); }
    finally { await load(); setBusy(false); }
  }
  async function remove(id: string) {
    try { await deleteAsset(id); await load(); }
    catch (e) { setNotice(e instanceof Error ? e.message : "Could not delete asset."); }
  }
  function download(asset: SavedAsset) {
    const url = URL.createObjectURL(asset.file);
    const a = document.createElement("a"); a.href = url; a.download = asset.name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <StudioShell active="/dashboard/assets" eyebrow="Your workspace" title="A quieter place for references.">
    <section className="dashboard-subpage"><div className="subpage-heading"><div><p className="eyebrow">Asset library</p><h2>Keep the right details close.</h2><p>References are saved in this browser, including after a refresh.</p></div></div>
      <div className="asset-library"><label className="asset-drop" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); void select(e.dataTransfer.files); }}>
        <input className="visually-hidden-input" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" multiple disabled={busy} onChange={e => { void select(e.target.files); e.target.value = ""; }} />
        <span>+</span><strong>{busy ? "Saving…" : "Drop reference files here or click to browse"}</strong><small>JPG, PNG, WEBP and PDF · up to 20MB each</small>
      </label><p className="studio-notice" role="status">{notice}</p>
      <div className="asset-list">{files.map(file => <div className="asset-row" key={file.id}><span className="asset-type">{file.name.split(".").pop()?.toUpperCase()}</span><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(1)} MB</small>
        {file.type.startsWith("image/") && <Link className="text-action" href={`/dashboard/text-to-sketch?asset=${file.id}`}>Use image ↗</Link>}
        <button className="text-action" onClick={() => download(file)}>Download</button><button className="text-action" onClick={() => remove(file.id)}>Delete</button>
      </div>)}{loading && <p role="status">Loading assets…</p>}{!loading && !files.length && <p className="empty-state">Your library is waiting for its first reference.</p>}</div></div>
    </section>
  </StudioShell>;
}
