"use client";

import { useEffect, useState } from "react";
import { GenerationCard } from "../../components/dashboard/GenerationCard";
import { StudioShell } from "../../components/dashboard/StudioShell";

export default function DashboardPage() {
  // Filled in after mount so the server and browser render the same first HTML
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  const hour = now?.getHours() ?? 9;
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const today = now ? now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : "Your studio";

  return <StudioShell active="/dashboard" eyebrow={today} title={`${greeting}, bring a space to life.`}>
        <section id="create" className="dashboard-intro"><div><p className="eyebrow">The generation studio</p><h2>Start with a sketch.<br /><em>Leave with a world.</em></h2></div><p>Upload the inputs you already have. Sketch Studio shapes them into the kind of output your next conversation needs.</p></section>
        <section className="generation-grid"><GenerationCard kind="video" /><GenerationCard kind="3d" /><GenerationCard kind="floor-plan" /><GenerationCard kind="walkthrough" /></section>
        <section id="projects" className="recent-projects"><div className="section-heading"><div><p className="eyebrow">Your workspace</p><h2>Recent projects</h2></div><button type="button" className="text-action">View all <span>↗</span></button></div><div className="project-list"><article className="project-row"><div className="project-thumb thumb-walkthrough"><span>3D</span></div><div className="project-info"><strong>Warm minimal apartment</strong><span>Navigatable home · 1 input</span></div><div className="project-status ready"><i />Ready</div><button type="button" className="project-more" aria-label="Open Warm minimal apartment">↗</button></article><article className="project-row"><div className="project-thumb thumb-3d"><span>3D</span></div><div className="project-info"><strong>North light kitchen</strong><span>3D render set · 2 inputs</span></div><div className="project-status ready"><i />Ready</div><button type="button" className="project-more" aria-label="Open North light kitchen">↗</button></article></div></section>
  </StudioShell>;
}
