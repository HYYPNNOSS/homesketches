"use client";

import { ClipboardEvent, DragEvent, FormEvent, KeyboardEvent, useRef, useState } from "react";
import {
  Direction,
  ImageInput,
  RenderResult,
  RoomwrightError,
  getDirection,
  renderDirection,
  toDataUrl,
} from "../../lib/roomwright";
import { PickedImage, fileToImageInput } from "../../lib/media";

const suggestions = ["Turn my sketch into a walkthrough", "Create a warm minimal render", "Clean up this floor plan"];
const MAX_IMAGES = 4;
const LOOKS = [
  ["auto", "Output: auto"],
  ["plan3d", "3D floor plan"],
  ["room", "Room render"],
  ["clean2d", "Clean 2D plan"],
  ["marker", "Marker plan"],
] as const;

type Props = {
  onSubmit?: (prompt: string, direction?: Direction, images?: ImageInput[]) => void;
  onResult?: (result: RenderResult, direction: Direction, images: ImageInput[]) => void;
};

function friendly(e: unknown): string {
  if (e instanceof RoomwrightError) {
    if (e.kind === "quota") return "The free daily limit is used up. It resets at 00:00 UTC.";
    if (e.kind === "rate") return "Please wait a moment and try again.";
    return e.message;
  }
  return "Something went wrong. Please try again.";
}

export function WorkspaceComposer({ onSubmit, onResult }: Props) {
  const [prompt, setPrompt] = useState("");
  const [images, setImages] = useState<PickedImage[]>([]);
  const [look, setLook] = useState<string>("auto");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [result, setResult] = useState<RenderResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function addFiles(list: Iterable<File>) {
    const files = Array.from(list);
    if (!files.length) return;
    const room = MAX_IMAGES - images.length;
    if (room <= 0) return setNote(`You can attach up to ${MAX_IMAGES} images.`);
    try {
      const picked = await Promise.all(files.slice(0, room).map(fileToImageInput));
      setImages((prev) => [...prev, ...picked].slice(0, MAX_IMAGES));
      setNote("");
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Couldn't read that image.");
    }
  }

  async function start(text: string) {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    setNote("");
    setResult(null);
    const inputs: ImageInput[] = images.map(({ data, mime }) => ({ data, mime }));

    try {
      let direction: Direction;
      try {
        direction = await getDirection(value);
      } catch {
        setNote("Couldn't reach the design service, so we continued without it.");
        onSubmit?.(value, undefined, inputs);
        return;
      }
      onSubmit?.(value, direction, inputs);

      if (direction.needsSketch && !inputs.length) {
        setNote("Attach a sketch or photo of the space (paperclip, drag it in, or paste), then press Start again.");
        return;
      }

      const walkthrough = direction.intent === "walkthrough";
      const chosen = look !== "auto" ? look : direction.look ?? (walkthrough ? "room" : undefined);
      const res = await renderDirection(
        { ...direction, look: chosen },
        { images: inputs.length ? inputs : undefined, aspect: inputs.length ? images[0].aspect : undefined },
      );
      setResult(res);
      if (walkthrough) setNote("Video walkthroughs aren't available yet — here is a still render of your space instead.");
      onResult?.(res, direction, inputs);
    } catch (e) {
      setNote(friendly(e));
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void start(prompt);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void start(prompt);
    }
  }

  function onPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const pasted = Array.from(event.clipboardData.files).filter((f) => f.type.startsWith("image/"));
    if (pasted.length) {
      event.preventDefault();
      void addFiles(pasted);
    }
  }

  function onDrop(event: DragEvent<HTMLFormElement>) {
    event.preventDefault();
    setDragging(false);
    void addFiles(event.dataTransfer.files);
  }

  return (
    <section className="workspace-composer" aria-label="AI workspace prompt" aria-busy={busy}>
      <div className="workspace-composer-heading">
        <span className="workspace-spark">✦</span>
        <div>
          <p className="eyebrow">Workspace assistant</p>
          <h2>What would you like to make?</h2>
        </div>
      </div>

      <form
        onSubmit={submit}
        className="workspace-prompt-form"
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={dragging ? { outline: "2px dashed #cdec52", outlineOffset: 4 } : undefined}
      >
        {images.length > 0 && (
          <div className="workspace-attachments">
            {images.map((img, i) => (
              <div key={i} className="workspace-attachment">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.preview} alt={`Attachment ${i + 1}`} />
                <button
                  type="button"
                  aria-label={`Remove attachment ${i + 1}`}
                  onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                  className="workspace-attachment-remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder="Describe a space, upload a sketch, or tell us what to turn into a visual..."
          rows={3}
        />

        <div className="workspace-prompt-footer">
          <span className="workspace-footer-left">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                void addFiles(e.target.files ?? []);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              className="workspace-attach"
              onClick={() => fileRef.current?.click()}
              disabled={busy || images.length >= MAX_IMAGES}
              aria-label="Attach images"
            >
              📎 Attach
            </button>
            {images.length > 0 && (
              <select
                value={look}
                onChange={(e) => setLook(e.target.value)}
                aria-label="Output type"
                className="workspace-look-select"
              >
                {LOOKS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            )}
            <span className="workspace-shortcut">⌘ Enter to render</span>
          </span>
          <button type="submit" disabled={!prompt.trim() || busy}>
            {busy ? "Rendering…" : "Start direction"} <b>↗</b>
          </button>
        </div>
        {note && <p role="status" className="workspace-note">{note}</p>}
      </form>

      {result && (
        <figure className="workspace-result">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={toDataUrl(result)} alt="Rendered result" />
          <figcaption>
            <a href={toDataUrl(result)} download={result.mime === "image/jpeg" ? "render.jpg" : "render.png"}>
              Download ↓
            </a>
          </figcaption>
        </figure>
      )}

      <div className="workspace-suggestions">
        {suggestions.map((suggestion) => (
          <button
            type="button"
            key={suggestion}
            disabled={busy}
            onClick={() => {
              setPrompt(suggestion);
              void start(suggestion);
            }}
          >
            {suggestion}
            <span>↗</span>
          </button>
        ))}
      </div>
    </section>
  );
}
