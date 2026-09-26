"use client";

import { StudioShell } from "../../../components/dashboard/StudioShell";
import { WorkspaceComposer } from "../../../components/dashboard/WorkspaceComposer";

export default function TextToSketchPage() {
  return <StudioShell active="/dashboard/text-to-sketch" eyebrow="01 / Create from language" title="Give the first idea a shape."><section className="text-to-sketch-page"><div className="text-to-sketch-intro"><p className="eyebrow">Text to Sketch</p><h2>Describe a room.<br /><em>We’ll find its lines.</em></h2><p>Start with a mood, a room, or a feeling. Turn words into a visual direction you can refine into a render, plan, or walkthrough.</p></div><WorkspaceComposer onSubmit={() => undefined} /><div className="text-to-sketch-notes"><div><span>01</span><strong>Set the scene</strong><p>Tell us about light, materials, scale, and the people the space is for.</p></div><div><span>02</span><strong>Choose a direction</strong><p>Use the resulting sketch as the starting point for any generation card.</p></div><div><span>03</span><strong>Keep shaping</strong><p>Your first idea is a beginning, not a constraint.</p></div></div></section></StudioShell>;
}