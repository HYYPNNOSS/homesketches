"use client";

import { useEffect, useState } from "react";
import { StudioShell } from "../../../components/dashboard/StudioShell";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
type Project = { id: string; name: string; mode: string; sourceFiles: string[]; status: string; progress: number; createdAt: string };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch(`${API_URL}/projects`).then((response) => response.ok ? response.json() : []).then(setProjects).catch(() => setProjects([])).finally(() => setLoading(false)); }, []);
  return <StudioShell active="/dashboard/projects" eyebrow="Your workspace" title="Projects that keep moving."><section className="dashboard-subpage"><div className="subpage-heading"><div><p className="eyebrow">Project archive</p><h2>Every idea, in one place.</h2><p>Follow generations from first upload to client-ready output.</p></div><a className="subpage-action" href="/dashboard">New project <span>+</span></a></div><div className="project-table"><div className="project-table-head"><span>Project</span><span>Output</span><span>Status</span><span>Created</span></div>{loading && <p className="empty-state">Loading your projects...</p>}{!loading && !projects.length && <p className="empty-state">No API projects yet. Start a new generation from the dashboard.</p>}{projects.map((project) => <div className="project-table-row" key={project.id}><div><strong>{project.name}</strong><small>{project.sourceFiles.length} source file{project.sourceFiles.length === 1 ? "" : "s"}</small></div><span>{project.mode}</span><b className={project.status}>{project.status === "processing" ? `${project.progress}%` : project.status}</b><span>{new Date(project.createdAt).toLocaleDateString()}</span></div>)}</div></section></StudioShell>;
}
