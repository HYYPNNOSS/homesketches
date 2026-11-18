import Link from "next/link";
import { StudioShell } from "../../../components/dashboard/StudioShell";
import { ProjectArchive } from "../../../components/dashboard/ProjectArchive";

export default function ProjectsPage() {
  return <StudioShell active="/dashboard/projects" eyebrow="Your workspace" title="Projects that keep moving.">
    <section className="dashboard-subpage"><div className="subpage-heading"><div><p className="eyebrow">Project archive</p><h2>Every idea, in one place.</h2><p>Open and download your completed generations.</p></div><Link className="subpage-action" href="/dashboard">New project +</Link></div><ProjectArchive /></section>
  </StudioShell>;
}
