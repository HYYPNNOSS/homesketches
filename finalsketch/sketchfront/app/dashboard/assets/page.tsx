"use client";

import { ChangeEvent, useState } from "react";
import { StudioShell } from "../../../components/dashboard/StudioShell";

export default function AssetsPage() {
  const [files, setFiles] = useState<string[]>([]);
  function select(event: ChangeEvent<HTMLInputElement>) { setFiles((current) => [...current, ...Array.from(event.target.files ?? []).map((file) => file.name)]); }
  return <StudioShell active="/dashboard/assets" eyebrow="Your workspace" title="A quieter place for references."><section className="dashboard-subpage"><div className="subpage-heading"><div><p className="eyebrow">Asset library</p><h2>Keep the right details close.</h2><p>Collect sketches, plans, and reference images for the next generation.</p></div><label className="subpage-action">Add assets <span>+</span><input className="visually-hidden-input" type="file" accept="image/*,.pdf" multiple onChange={select} /></label></div><div className="asset-library"><label className="asset-drop"><input className="visually-hidden-input" type="file" accept="image/*,.pdf" multiple onChange={select} /><span>+</span><strong>Drop reference files here</strong><small>Images and PDFs up to 20MB</small></label><div className="asset-list">{files.length ? files.map((file, index) => <div className="asset-row" key={`${file}-${index}`}><span className="asset-type">{file.split(".").pop()?.toUpperCase()}</span><strong>{file}</strong><small>Ready to use</small></div>) : <p className="empty-state">Your library is waiting for its first reference.</p>}</div></div></section></StudioShell>;
}
