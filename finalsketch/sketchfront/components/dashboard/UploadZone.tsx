"use client";

import { ChangeEvent, DragEvent, useEffect, useId, useMemo, useState } from "react";

const MAX_BYTES = 20 * 1024 * 1024;

export function UploadZone({
  multiple,
  files,
  onChange,
  disabled,
}: {
  multiple?: boolean;
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}) {
  const id = useId(); // unique ID per instance — no more shared ids
  const [isDragging, setIsDragging] = useState(false);
  const [note, setNote] = useState("");

  // Thumbnails for the picked images
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  function addFiles(next: FileList | null) {
    if (!next || disabled) return;
    const all = Array.from(next);
    const incoming = all.filter((file) => file.type.startsWith("image/") && file.size <= MAX_BYTES);
    const skipped = all.length - incoming.length;
    setNote(skipped ? `${skipped} file${skipped === 1 ? " was" : "s were"} skipped — use JPG, PNG or WEBP images up to 20MB.` : "");
    if (!incoming.length) return;
    onChange(multiple ? [...files, ...incoming].slice(0, 12) : incoming.slice(0, 1));
  }

  function drop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  }

  function select(event: ChangeEvent<HTMLInputElement>) {
    addFiles(event.target.files);
    event.target.value = ""; // allow picking the same file again
  }

  return (
    <div className={`dashboard-upload ${isDragging ? "dragging" : ""}`}>
      <input
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple={multiple}
        onChange={select}
        disabled={disabled}
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
            ? `${files.length} input${files.length === 1 ? "" : "s"} selected${multiple ? " — add more" : " — click to replace"}`
            : "Drop sketches or images here"}
        </strong>
        <small>
          {note || (multiple ? "Add 2–12 views for a navigable home" : "One JPG, PNG or WEBP up to 20MB")}
        </small>
      </label>
      {files.length > 0 && (
        <div className="dashboard-thumbs">
          {files.map((file, i) => (
            <div className="dashboard-thumb" key={`${file.name}-${i}`} title={file.name}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previews[i]} alt={file.name} />
              {!disabled && (
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => onChange(files.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
