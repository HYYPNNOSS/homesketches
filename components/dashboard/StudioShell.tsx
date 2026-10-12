"use client";

import Link from "next/link";
import { ReactNode, useState } from "react";
import Image from "next/image";

const navigation = [
  ["Text to Sketch", "/dashboard/text-to-sketch", "✨"],
  ["Sketch Space", "/dashboard/sketch", "📐"],
  ["Workspace", "/dashboard", "🏠"],
  ["Your projects", "/dashboard/projects", "📁"],
  ["Asset library", "/dashboard/assets", "🎨"],
  ["Settings", "/dashboard/settings", "⚙️"],
] as const;

export function StudioShell({ active, eyebrow, title, children, fullBleed, hideHeader }: { active: string; eyebrow: string; title: string; children: ReactNode; fullBleed?: boolean; hideHeader?: boolean }) {
  const [isFolded, setIsFolded] = useState(false);

  return (
    <main className={`studio-shell ${isFolded ? "folded" : ""}`}>
      <aside className="studio-sidebar">
        <button className="sidebar-toggle" onClick={() => setIsFolded(!isFolded)}>
           {isFolded ? "→" : "←"}
        </button>
        <Link href="/" className="studio-brand">
          <Image src='/logo.png' height={30} width={30} alt="Logo" />
          <span className="brand-text">HomeSketches Studio</span>
        </Link>
        <div className="studio-nav-label">Workspace</div>
        <nav className="studio-nav">
          {navigation.map(([label, href, icon], index) => (
            <Link 
              className={`${active === href ? "active" : ""} ${index === 2 ? "studio-nav-secondary" : ""}`} 
              href={href} 
              key={`${label}-${index}`}
              title={label}
            >
              <span className="nav-icon">{icon}</span>
              <span className="nav-label">{label}</span>
              {!isFolded && label === "Your projects" && <span className="nav-badge">04</span>}
            </Link>
          ))}
        </nav>
        <div className="studio-sidebar-bottom">
          {!isFolded && (
            <div className="studio-plan">
              <span>Studio plan</span>
              <strong>12 generations left</strong>
              <div><i /></div>
              <small>Resets in 18 days</small>
            </div>
          )}
          <Link href="/" className="studio-back">
            {!isFolded && <span>Back to website</span>}
            <span className="nav-icon">↗</span>
          </Link>
        </div>
      </aside>
      <section className="studio-main">
        {!hideHeader && (
          <header className="studio-topbar">
            <div>
              <p className="eyebrow">{eyebrow}</p>
              <h1>{title}</h1>
            </div>
            <div className="studio-avatar">AK</div>
          </header>
        )}
        <div className={`studio-content${fullBleed ? " studio-content-full" : ""}`}>
          {children}
        </div>
      </section>
    </main>
  );
}
