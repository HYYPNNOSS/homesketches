"use client";

import { useState } from "react";
import Link from "next/link";

const links = [
  ["Services", "/services"],
  ["Use Cases", "/use-cases"],
  ["Sketch Space", "/dashboard/sketch"],
  ["Portfolio", "/portfolio"],
  ["Pricing", "/pricing"],
  ["Contact", "/contact"],
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return <header className="site-page-header">
    <div className="site-header-inner">
      <Link href="/" className="site-page-logo">HomeSketeches</Link>
      <nav className={`site-page-nav ${open ? "open" : ""}`} aria-label="Main navigation">
        {links.map(([label, href]) => <Link href={href} key={href} onClick={() => setOpen(false)}>{label}</Link>)}
      </nav>
      <div className="site-page-actions">
        <Link href="/signin" className="site-signin-link">SIGN IN</Link>
        <Link href="/signup" className="site-start-button">START A PROJECT <span>↗</span></Link>
        <button type="button" className="site-menu-button" aria-label="Toggle navigation" aria-expanded={open} onClick={() => setOpen((value) => !value)}><i /><i /><i /></button>
      </div>
    </div>
  </header>;
}
