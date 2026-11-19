"use client";

import Link from "next/link";
import Image from "next/image";
import { ReactElement, ReactNode, useEffect, useState } from "react";

type IconName = "spark" | "sketch" | "home" | "folder" | "palette" | "settings" | "external" | "chevron";

const ICONS: Record<IconName, ReactElement> = {
  spark: <><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" /></>,
  sketch: <><path d="M4 20h16" /><path d="M4 20V4l16 16" /><path d="M8 16v-4l4 4z" /></>,
  home: <><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></>,
  folder: <><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></>,
  palette: <><path d="M12 3a9 9 0 100 18c1.1 0 1.8-.9 1.5-1.9-.3-1 .4-2.1 1.5-2.1H17a4 4 0 004-4c0-5.5-4-10-9-10z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10" cy="7" r="1" /><circle cx="15" cy="7.5" r="1" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></>,
  external: <><path d="M14 4h6v6" /><path d="M20 4l-9 9" /><path d="M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" /></>,
  chevron: <path d="M15 6l-6 6 6 6" />,
};

function NavIcon({ name }: { name: IconName }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

const sections: { label: string; items: { label: string; href: string; icon: IconName }[] }[] = [
  {
    label: "Create",
    items: [
      { label: "Workspace", href: "/dashboard", icon: "home" },
      { label: "Text to Sketch", href: "/dashboard/text-to-sketch", icon: "spark" },
      { label: "Sketch Space", href: "/dashboard/sketch", icon: "sketch" },
    ],
  },
  {
    label: "Library",
    items: [
      { label: "Your projects", href: "/dashboard/projects", icon: "folder" },
      { label: "Asset library", href: "/dashboard/assets", icon: "palette" },
    ],
  },
  {
    label: "Account",
    items: [{ label: "Settings", href: "/dashboard/settings", icon: "settings" }],
  },
];

const FOLD_KEY = "studio-sidebar-folded";

export function StudioShell({ active, eyebrow, title, children, fullBleed, hideHeader }: { active: string; eyebrow: string; title: string; children: ReactNode; fullBleed?: boolean; hideHeader?: boolean }) {
  const [isFolded, setIsFolded] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(FOLD_KEY) === "1") setIsFolded(true);
    } catch {}
  }, []);

  const toggleFold = () => {
    setIsFolded((folded) => {
      try { localStorage.setItem(FOLD_KEY, folded ? "0" : "1"); } catch {}
      return !folded;
    });
  };

  return (
    <main className={`studio-shell ${isFolded ? "folded" : ""}`}>
      <aside className="studio-sidebar" aria-label="Studio navigation">
        <div className="studio-sidebar-head">
          <Link href="/" className="studio-brand" title="HomeSketches">
            <span className="studio-brand-logo"><Image src="/logo.png" height={28} width={28} alt="HomeSketches" /></span>
            <span className="brand-text">HomeSketches<small>Studio</small></span>
          </Link>
          <button
            type="button"
            aria-label={isFolded ? "Expand navigation" : "Collapse navigation"}
            aria-expanded={!isFolded}
            className="sidebar-toggle"
            onClick={toggleFold}
          >
            <NavIcon name="chevron" />
          </button>
        </div>

        <div className="studio-sidebar-scroll">
          {sections.map((section) => (
            <div className="studio-nav-group" key={section.label}>
              <div className="studio-nav-label">{section.label}</div>
              <nav className="studio-nav" aria-label={section.label}>
                {section.items.map((item) => {
                  const isActive = active === item.href;
                  return (
                    <Link
                      className={isActive ? "active" : ""}
                      aria-current={isActive ? "page" : undefined}
                      href={item.href}
                      key={item.href}
                      data-tooltip={item.label}
                    >
                      <span className="nav-icon"><NavIcon name={item.icon} /></span>
                      <span className="nav-label">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        <div className="studio-sidebar-bottom">
          <div className="studio-plan">
            <span className="studio-plan-dot" aria-hidden="true" />
            <div>
              <strong>Ideas worth keeping</strong>
              <small>Projects and assets are saved in this browser.</small>
            </div>
          </div>
          <Link href="/" className="studio-back" data-tooltip="Back to website">
            <span className="nav-icon"><NavIcon name="external" /></span>
            <span className="nav-label">Back to website</span>
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
            <Link className="studio-avatar" href="/dashboard/settings" aria-label="Account settings">⚙</Link>
          </header>
        )}
        <div className={`studio-content${fullBleed ? " studio-content-full" : ""}`}>
          {children}
        </div>
      </section>
    </main>
  );
}
