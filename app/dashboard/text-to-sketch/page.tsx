"use client";

import { useState } from "react";
import { StudioShell } from "../../../components/dashboard/StudioShell";
import { WorkspaceComposer } from "../../../components/dashboard/WorkspaceComposer";
import type { Direction, RenderResult, ImageInput } from "../../../lib/roomwright";
import { toDataUrl } from "../../../lib/roomwright";

export default function TextToSketchPage() {
  const [result, setResult] = useState<{ res: RenderResult; direction: Direction; images: ImageInput[] } | null>(null);

  function handleResult(res: RenderResult, direction: Direction, images: ImageInput[]) {
    setResult({ res, direction, images });
  }

  return (
    <StudioShell active="/dashboard/text-to-sketch" eyebrow="01 / Create from language" title="Give the first idea a shape.">
      <div className="tts-page">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <header className="tts-hero">
          <div className="tts-hero-copy">
            <p className="eyebrow">Text to Sketch</p>
            <h1>Describe a room.<br /><em>We&apos;ll find its lines.</em></h1>
            <p>Start with a mood, a room, or a feeling. Turn words into a visual direction — render, plan, or walkthrough.</p>
          </div>
          <div className="tts-hero-steps">
            <div className="tts-step"><span>01</span><strong>Set the scene</strong><p>Describe light, materials, scale and who it&apos;s for.</p></div>
            <div className="tts-step"><span>02</span><strong>Pick a direction</strong><p>The render becomes the seed for any generation card.</p></div>
            <div className="tts-step"><span>03</span><strong>Keep shaping</strong><p>Your first idea is a beginning, not a constraint.</p></div>
          </div>
        </header>

        {/* ── Composer ──────────────────────────────────────────── */}
        <div className="tts-composer-wrap">
          <WorkspaceComposer onResult={handleResult} />
        </div>

        {/* ── Result ────────────────────────────────────────────── */}
        {result && (
          <div className="tts-result">
            <div className="tts-result-image">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={toDataUrl(result.res)} alt="Generated render" />
            </div>
            <div className="tts-result-panel">
              <p className="eyebrow">Your render</p>
              <h2>Direction generated</h2>
              {result.direction.look && (
                <div className="tts-result-meta">
                  <span>Look</span>
                  <strong>{result.direction.look}</strong>
                </div>
              )}
              {result.direction.style && (
                <div className="tts-result-meta">
                  <span>Style</span>
                  <strong>{result.direction.style}</strong>
                </div>
              )}
              {result.direction.light && (
                <div className="tts-result-meta">
                  <span>Lighting</span>
                  <strong>{result.direction.light}</strong>
                </div>
              )}
              {result.direction.room && (
                <div className="tts-result-meta">
                  <span>Space</span>
                  <strong>{result.direction.room}</strong>
                </div>
              )}
              <div className="tts-result-actions">
                <a
                  href={toDataUrl(result.res)}
                  download={result.res.mime === "image/jpeg" ? "render.jpg" : "render.png"}
                  className="tts-action tts-action-primary"
                >
                  Download ↓
                </a>
                <a href="/dashboard" className="tts-action">Use in Workspace ↗</a>
                <button type="button" onClick={() => setResult(null)} className="tts-action tts-action-ghost">
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </StudioShell>
  );
}
