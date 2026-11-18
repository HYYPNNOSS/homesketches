"use client";

import Link from "next/link";
import { GenerationCard } from "../../components/dashboard/GenerationCard";
import { ProjectArchive } from "../../components/dashboard/ProjectArchive";
import { StudioShell } from "../../components/dashboard/StudioShell";

export default function DashboardPage() {
  return <StudioShell active="/dashboard" eyebrow="Your creation studio" title="Bring a space to life.">
    <section id="create" className="dashboard-intro"><div><p className="eyebrow">The generation studio</p><h2>Start with a sketch.<br /><em>Leave with a world.</em></h2></div><p>Upload a sketch or reference image, then choose the output you need.</p></section>
    <section className="generation-grid"><GenerationCard kind="video" /><GenerationCard kind="3d" /><GenerationCard kind="floor-plan" /><GenerationCard kind="walkthrough" /></section>
    <section id="projects" className="recent-projects"><div className="section-heading"><div><p className="eyebrow">Your workspace</p><h2>Recent projects</h2></div><Link href="/dashboard/projects" className="text-action">View all ↗</Link></div><ProjectArchive limit={4} /></section>
  </StudioShell>;
}
