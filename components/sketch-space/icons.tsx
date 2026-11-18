import type { ReactElement } from "react";

/** Minimal stroke icon set for Sketch Space (24×24, currentColor). */
const PATHS: Record<string, ReactElement> = {
  select: <path d="M5 3l14 7.5-6.2 1.6L10 18.5z" />,
  "box-select": <><path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3" /><path d="M10 10l7 3.5-3 .8-1.4 3z" /></>,
  wall: <><path d="M4 19V8h10" strokeWidth={3.2} /><circle cx="4" cy="19" r="1.4" /><circle cx="14" cy="8" r="1.4" /></>,
  room: <><rect x="4" y="4" width="16" height="16" rx="1" /><path d="M4 12h6M14 12h6" strokeDasharray="2 2" /></>,
  door: <><path d="M4 20h16" /><path d="M7 20V6h8v14" /><path d="M15 6a8 8 0 01-0 14" strokeDasharray="2 2" /></>,
  window: <><rect x="4" y="5" width="16" height="14" rx="1" /><path d="M12 5v14M4 12h16" /></>,
  furniture: <><path d="M5 11V8a2 2 0 012-2h10a2 2 0 012 2v3" /><path d="M3 12a2 2 0 014 0v2h10v-2a2 2 0 014 0v5H3z" /><path d="M5 17v2M19 17v2" /></>,
  label: <><path d="M5 6V4h14v2M12 4v16M9 20h6" /></>,
  eraser: <><path d="M8 20h12" /><path d="M4.5 15.5l9.9-9.9a2 2 0 012.8 0l1.2 1.2a2 2 0 010 2.8L11 17H7z" /><path d="M9 11l4 4" /></>,
  camera: <><path d="M4 8h3l2-2.5h6L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.2" /></>,
  top: <><rect x="4" y="4" width="16" height="16" rx="1.5" /><path d="M4 10h16M10 10v10" /></>,
  perspective: <><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" /></>,
  "eye-level": <><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  undo: <><path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 010 11H11" /></>,
  redo: <><path d="M15 14l5-5-5-5" /><path d="M20 9H9.5a5.5 5.5 0 000 11H13" /></>,
  trash: <><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
  fit: <><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" /></>,
  reset: <><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v5h5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  layers: <><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></>,
  ruler: <><rect x="2.5" y="8" width="19" height="8" rx="1" /><path d="M6.5 8v3M10.5 8v4M14.5 8v3M18.5 8v4" /></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" /></>,
  panel: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M15 4v16" /></>,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  rotate: <><path d="M20 12a8 8 0 11-2.3-5.7" /><path d="M20 4v5h-5" /></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3" /></>,
  paste: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1M9 10h6M9 14h6" /></>,
  duplicate: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M14 11v6M11 14h6M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3" /></>,
  move: <><path d="M12 3v18M3 12h18" /><path d="M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" /></>,
  scale: <><path d="M4 20l7-7M4 20v-5M4 20h5" /><rect x="11" y="4" width="9" height="9" rx="1" /></>,
};

export function SkIcon({ name, size = 18 }: { name: keyof typeof PATHS | string; size?: number }) {
  return (
    <svg
      className="sk-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name] ?? null}
    </svg>
  );
}
