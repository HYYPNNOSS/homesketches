"use client";

import Link from "next/link";
import { ReactNode } from "react";

const navigation = [
  ["Text to Sketch", "/dashboard/text-to-sketch"],
  ["Workspace", "/dashboard"],
  ["Your projects", "/dashboard/projects"],
  ["Asset library", "/dashboard/assets"],
  ["Settings", "/dashboard/settings"],
] as const;

export function StudioShell({ active, eyebrow, title, children }: { active: string; eyebrow: string; title: string; children: ReactNode }) {
  return <main className="studio-shell"><aside className="studio-sidebar"><Link href="/" className="studio-brand"><span className="studio-brand-mark">S</span><span>Sketch Studio</span></Link><div className="studio-nav-label">Workspace</div><nav className="studio-nav">{navigation.map(([label, href], index) => <Link className={`${active === href ? "active" : ""} ${index === 1 ? "studio-nav-secondary" : ""}`} href={href} key={`${label}-${index}`}>{label}<span>{label === "Your projects" ? "04" : label === "Create output" ? "+" : ""}</span></Link>)}</nav><div className="studio-sidebar-bottom"><div className="studio-plan"><span>Studio plan</span><strong>12 generations left</strong><div><i /></div><small>Resets in 18 days</small></div><Link href="/" className="studio-back">Back to website <span>↗</span></Link></div></aside><section className="studio-main"><header className="studio-topbar"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div><div className="studio-avatar">AK</div></header><div className="studio-content">{children}</div></section></main>;
}
