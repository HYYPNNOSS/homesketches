"use client";
import { useEffect, useMemo, useState } from "react";
import { buildAiPrompt, buildProjectFromAiJson, type AiBuildResult } from "./ai-json";
import type { Project } from "./types";

const EXAMPLE = `{
  "name": "Garden flat",
  "floors": [{
    "name": "Ground Floor",
    "rooms": [
      { "name": "Living Room", "x": 0, "z": 0, "w": 5.2, "d": 4.2, "floor": "oak-wood", "walls": "white-plaster" },
      { "name": "Kitchen", "x": 5.2, "z": 0, "w": 3.2, "d": 4.2, "floor": "terrazzo", "walls": "subway-tile" },
      { "name": "Bedroom", "x": 0, "z": 4.2, "w": 4, "d": 3.6, "floor": "cozy-carpet", "walls": "limewash" },
      { "name": "Bathroom", "x": 4, "z": 4.2, "w": 2.2, "d": 3.6, "floor": "slate-tile", "walls": "ceramic-tile" },
      { "name": "Hall", "x": 6.2, "z": 4.2, "w": 2.2, "d": 3.6, "floor": "herringbone-oak" }
    ],
    "openings": [
      { "type": "door", "room": "Hall", "side": "south", "w": 1.0 },
      { "type": "door", "between": ["Hall", "Kitchen"] },
      { "type": "door", "between": ["Living Room", "Kitchen"], "w": 1.2 },
      { "type": "door", "between": ["Living Room", "Bedroom"], "w": 0.8 },
      { "type": "door", "between": ["Bathroom", "Hall"], "w": 0.8 },
      { "type": "window", "room": "Living Room", "side": "north", "w": 2.4, "h": 1.5 },
      { "type": "window", "room": "Kitchen", "side": "east", "w": 1.4 },
      { "type": "window", "room": "Bedroom", "side": "west", "w": 1.6 }
    ],
    "items": [
      { "kind": "sofa", "x": 2.6, "z": 3.1, "rotDeg": 180, "w": 2.4 },
      { "kind": "rug", "x": 2.6, "z": 2.1, "w": 2.4, "d": 1.7 },
      { "kind": "tv", "x": 2.6, "z": 0.35 },
      { "kind": "plant", "x": 0.5, "z": 0.5 },
      { "kind": "kitchen", "x": 6.8, "z": 0.35, "w": 3.0 },
      { "kind": "table", "x": 6.8, "z": 2.5, "w": 1.4, "d": 0.9 },
      { "kind": "bed", "x": 2, "z": 5.4 },
      { "kind": "wardrobe", "x": 0.35, "z": 6.6, "rotDeg": 90 },
      { "kind": "bath", "x": 5.1, "z": 6.8, "rotDeg": 90 },
      { "kind": "toilet", "x": 4.4, "z": 4.65 }
    ]
  }]
}`;

export function AiJsonPanel({ onBuild, onGetProject, onStarter }: {
  onBuild: (project: Project) => boolean;
  onGetProject: () => Project;
  onStarter?: (brief: string) => Promise<string>;
}) {
  const [brief, setBrief] = useState("");
  const [json, setJson] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [debounced, setDebounced] = useState("");
  useEffect(() => { const t = setTimeout(() => setDebounced(json), 250); return () => clearTimeout(t); }, [json]);
  const parsed = useMemo<{ result?: AiBuildResult; error?: string }>(() => {
    if (!debounced.trim()) return {};
    try { return { result: buildProjectFromAiJson(debounced) }; } catch (e) { return { error: e instanceof Error ? e.message : "Invalid JSON." }; }
  }, [debounced]);

  async function copy(text: string, done: string) {
    try { await navigator.clipboard.writeText(text); setNote(done); }
    catch { setNote("Clipboard is blocked here — select the text and copy it manually."); }
  }

  function build() {
    let result: AiBuildResult;
    try { result = buildProjectFromAiJson(json); } catch (e) { setNote(e instanceof Error ? e.message : "Invalid JSON."); return; }
    if (onBuild(result.project)) setNote(`Built ${result.stats.rooms} rooms, ${result.stats.walls} walls, ${result.stats.openings} doors/windows and ${result.stats.items} items. Undo (Ctrl+Z) restores the previous design.`);
  }

  const stats = parsed.result?.stats;
  return (
    <div className="sk-panel-section sk-ai">
      <div className="sk-panel-heading">
        <span className="sk-panel-eyebrow">AI → Sketch</span>
        <h2 className="sk-panel-title">Build from JSON</h2>
      </div>

      <ol className="sk-ai-steps">
        <li>
          <strong>Describe the space</strong>
          <textarea className="sk-textarea" rows={3} value={brief} onChange={e => setBrief(e.target.value)} aria-label="Describe the space for the AI"
            placeholder="e.g. 85 m² two-bedroom flat, open kitchen-living facing south, ensuite, Scandinavian finishes" />
          <div className="sk-ai-row">
            <button type="button" className="sk-ai-btn sk-ai-primary" onClick={() => copy(buildAiPrompt(brief), "Prompt copied. Paste it into ChatGPT, Claude or Gemini, then paste the JSON it returns below.")}>Copy AI prompt</button>
            <button type="button" className="sk-ai-btn" onClick={() => copy(JSON.stringify(onGetProject(), null, 2), "Current design copied as JSON. Paste it to an AI with your changes, e.g. “add a study next to the bedroom”.")}>Copy current design</button>
          </div>
        </li>
        <li>
          <strong>Paste the JSON it returns</strong>
          <textarea className="sk-textarea sk-json-area" rows={10} spellCheck={false} value={json} onChange={e => { setJson(e.target.value); setNote(""); }}
            aria-label="Paste AI JSON" placeholder={'{\n  "rooms": [ { "name": "Living Room", "x": 0, "z": 0, "w": 5, "d": 4 } ]\n}'} />
          <div className="sk-ai-row">
            <button type="button" className="sk-ai-btn" onClick={() => setJson(EXAMPLE)}>Load example</button>
            {json && <button type="button" className="sk-ai-btn" onClick={() => setJson("")}>Clear</button>}
          </div>
          <div className="sk-ai-status" role="status" aria-live="polite">
            {parsed.error && <p className="sk-ai-error">{parsed.error}</p>}
            {stats && <p className="sk-ai-ok">Ready: {stats.floors > 1 ? `${stats.floors} floors · ` : ""}{stats.rooms} rooms · {stats.walls} walls · {stats.openings} openings · {stats.items} items{stats.materials ? ` · ${stats.materials} materials` : ""}</p>}
            {!!parsed.result?.warnings.length && <ul className="sk-ai-warnings">{parsed.result.warnings.slice(0, 6).map(w => <li key={w}>{w}</li>)}</ul>}
          </div>
        </li>
        <li>
          <strong>Build it</strong>
          <button type="button" className="sk-render-btn" style={{ width: "100%" }} disabled={!parsed.result} onClick={build}>Build in Sketch <span>→</span></button>
        </li>
      </ol>
      {note && <p className="sk-ai-note" role="alert">{note}</p>}

      {onStarter && (
        <details className="sk-ai-starter">
          <summary>No AI handy? Use a built-in starter layout</summary>
          <button type="button" className="sk-ai-btn" disabled={busy || !brief.trim()} onClick={async () => { setBusy(true); try { setNote(await onStarter(brief)); } finally { setBusy(false); } }}>
            {busy ? "Generating…" : "Generate starter from description"}
          </button>
        </details>
      )}
    </div>
  );
}
