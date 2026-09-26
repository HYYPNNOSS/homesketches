"use client";

import { FormEvent, useState } from "react";

const suggestions = ["Turn my sketch into a walkthrough", "Create a warm minimal render", "Clean up this floor plan"];

export function WorkspaceComposer({ onSubmit }: { onSubmit: (prompt: string) => void }) {
  const [prompt, setPrompt] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (prompt.trim()) onSubmit(prompt.trim()); }
  return <section className="workspace-composer" aria-label="AI workspace prompt"><div className="workspace-composer-heading"><span className="workspace-spark">✦</span><div><p className="eyebrow">Workspace assistant</p><h2>What would you like to make?</h2></div></div><form onSubmit={submit} className="workspace-prompt-form"><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Describe a space, upload a sketch, or tell us what to turn into a visual..." rows={3} /><div className="workspace-prompt-footer"><span>⌘ Enter to start a direction</span><button type="submit" disabled={!prompt.trim()}>Start direction <b>↗</b></button></div></form><div className="workspace-suggestions">{suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => setPrompt(suggestion)}>{suggestion}<span>↗</span></button>)}</div></section>;
}
