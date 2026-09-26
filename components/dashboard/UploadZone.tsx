"use client";

import { ChangeEvent, DragEvent, useState } from "react";

export function UploadZone({ multiple, files, onChange }: { multiple?: boolean; files: File[]; onChange: (files: File[]) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  function addFiles(next: FileList | null) { if (next) onChange(Array.from(next)); }
  function drop(event: DragEvent<HTMLLabelElement>) { event.preventDefault(); setIsDragging(false); addFiles(event.dataTransfer.files); }
  function select(event: ChangeEvent<HTMLInputElement>) { addFiles(event.target.files); }

  return <div className={`dashboard-upload ${isDragging ? "dragging" : ""}`}>
    <input id="dashboard-upload-input" type="file" accept="image/*,.pdf" multiple={multiple} onChange={select} />
    <label htmlFor="dashboard-upload-input" onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={drop}>
      <span className="dashboard-upload-icon">+</span>
      <strong>{files.length ? `${files.length} input${files.length === 1 ? "" : "s"} selected` : "Drop sketches or images here"}</strong>
      <small>{multiple ? "Add 2–12 views for a navigable home" : "One JPG, PNG, WEBP, or PDF up to 20MB"}</small>
    </label>
    {files.length > 0 && <div className="dashboard-file-list">{files.map((file) => <span key={`${file.name}-${file.lastModified}`}>{file.name}</span>)}</div>}
  </div>;
}
