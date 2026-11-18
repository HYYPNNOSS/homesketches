"use client";

import { useId } from "react";
import { ChangeEvent, DragEvent, useState } from "react";

export function UploadZone({
  multiple,
  files,
  onChange,
}: {
  multiple?: boolean;
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const id = useId(); // unique ID per instance — no more shared ids
  const [isDragging, setIsDragging] = useState(false);

  function addFiles(next: FileList | null) {
    if (!next) return;
    const incoming = Array.from(next);
    onChange(multiple ? [...files, ...incoming].slice(0, 12) : incoming);
  }

  function drop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  }

  function select(event: ChangeEvent<HTMLInputElement>) {
    addFiles(event.target.files);
  }

  return (
    <div className={`dashboard-upload ${isDragging ? "dragging" : ""}`}>
      <input
        id={id}
        type="file"
        accept="image/*,.pdf"
        multiple={multiple}
        onChange={select}
      />
      <label
        htmlFor={id}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={drop}
      >
        <span className="dashboard-upload-icon">+</span>
        <strong>
          {files.length
            ? `${files.length} input${files.length === 1 ? "" : "s"} selected`
            : "Drop sketches or images here"}
        </strong>
        <small>
          {multiple ? "Add 2–12 views for a navigable home" : "One JPG, PNG, WEBP, or PDF up to 20MB"}
        </small>
      </label>
      {files.length > 0 && (
        <div className="dashboard-file-list">
          {files.map((file, i) => (
            <span key={`${file.name}-${i}`}>{file.name}</span>
          ))}
        </div>
      )}
    </div>
  );
}
