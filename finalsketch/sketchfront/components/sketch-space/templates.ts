/**
 * Starter floor plans for Sketch Space.
 * Coordinates start at (0, 0); the engine re-centres a plan on the sheet when it loads it.
 */
import type { Scene } from "./types";

export interface PlanTemplate {
  id: string;
  label: string;
  hint: string;
  build: () => Scene;
}

function studio(): Scene {
  return {
    unit: "m",
    canvas: { widthM: 10, depthM: 8, gridStep: 0.1 },
    walls: [
      { id: "w1", a: [0, 0], b: [7, 0] },
      { id: "w2", a: [7, 0], b: [7, 5] },
      { id: "w3", a: [7, 5], b: [0, 5] },
      { id: "w4", a: [0, 5], b: [0, 0] },
      { id: "w5", a: [5, 0], b: [5, 2] },
      { id: "w6", a: [5, 2], b: [7, 2] },
    ],
    rooms: [
      { id: "r1", name: "Studio", x: 0, z: 0, w: 5, d: 5, materialId: "oak-wood" },
      { id: "r2", name: "Bathroom", x: 5, z: 0, w: 2, d: 2, materialId: "slate-tile" },
      { id: "r3", name: "Entry", x: 5, z: 2, w: 2, d: 3, materialId: "oak-wood" },
    ],
    openings: [
      { id: "o1", type: "door", at: [7, 3.5], w: 0.9, wallId: "w2" },
      { id: "o2", type: "door", at: [6, 2], w: 0.8, wallId: "w6" },
      { id: "o3", type: "window", at: [2.5, 0], w: 1.8, wallId: "w1" },
      { id: "o4", type: "window", at: [0, 2.5], w: 1.4, wallId: "w4" },
    ],
    items: [
      { id: "i1", kind: "bed", x: 1.2, z: 1.4, rot: 0 },
      { id: "i2", kind: "tv", x: 3.9, z: 4.7, rot: Math.PI },
      { id: "i3", kind: "table", x: 3.6, z: 2.6, rot: 0 },
      { id: "i7", kind: "chair", x: 3.6, z: 3.5, rot: 0 },
      { id: "i4", kind: "kitchen", x: 1.8, z: 4.6, rot: Math.PI },
      { id: "i5", kind: "toilet", x: 6.5, z: 0.6, rot: 0 },
      { id: "i6", kind: "plant", x: 4.5, z: 0.5, rot: 0 },
    ],
  };
}

function oneBed(): Scene {
  return {
    unit: "m",
    canvas: { widthM: 10, depthM: 8, gridStep: 0.1 },
    walls: [
      { id: "w1", a: [0, 0], b: [10, 0] },
      { id: "w2", a: [10, 0], b: [10, 8] },
      { id: "w3", a: [10, 8], b: [0, 8] },
      { id: "w4", a: [0, 8], b: [0, 0] },
      { id: "w5", a: [5, 0], b: [5, 8] },
    ],
    rooms: [
      { id: "r1", name: "Living Room", x: 0, z: 0, w: 5, d: 8, materialId: "oak-wood" },
      { id: "r2", name: "Bedroom", x: 5, z: 0, w: 5, d: 8, materialId: "cozy-carpet" },
    ],
    openings: [
      { id: "o1", type: "door", at: [2.5, 0], w: 0.9, wallId: "w1" },
      { id: "o2", type: "door", at: [5, 4], w: 0.85, wallId: "w5" },
      { id: "o3", type: "window", at: [2.5, 8], w: 1.6, wallId: "w3" },
      { id: "o4", type: "window", at: [10, 4], w: 1.4, wallId: "w2" },
    ],
    items: [
      { id: "i1", kind: "sofa", x: 2.5, z: 5, rot: 0 },
      { id: "i2", kind: "bed", x: 7.5, z: 4, rot: 0 },
      { id: "i3", kind: "wardrobe", x: 7.5, z: 1.5, rot: 0 },
      { id: "i4", kind: "plant", x: 0.8, z: 6.8, rot: 0 },
    ],
  };
}

function twoBed(): Scene {
  return {
    unit: "m",
    canvas: { widthM: 14, depthM: 10, gridStep: 0.1 },
    walls: [
      { id: "w1", a: [0, 0], b: [14, 0] },
      { id: "w2", a: [14, 0], b: [14, 10] },
      { id: "w3", a: [14, 10], b: [0, 10] },
      { id: "w4", a: [0, 10], b: [0, 0] },
      { id: "w5", a: [7, 0], b: [7, 10] },
      { id: "w6", a: [7, 5], b: [14, 5] },
    ],
    rooms: [
      { id: "r1", name: "Living & Kitchen", x: 0, z: 0, w: 7, d: 10, materialId: "oak-wood" },
      { id: "r2", name: "Primary Bedroom", x: 7, z: 0, w: 7, d: 5, materialId: "cozy-carpet" },
      { id: "r3", name: "Second Bedroom", x: 7, z: 5, w: 7, d: 5, materialId: "oak-wood" },
    ],
    openings: [
      { id: "o1", type: "door", at: [3.5, 0], w: 0.9, wallId: "w1" },
      { id: "o2", type: "door", at: [7, 2.5], w: 0.85, wallId: "w5" },
      { id: "o3", type: "door", at: [7, 7.5], w: 0.85, wallId: "w5" },
      { id: "o4", type: "window", at: [3.5, 10], w: 2.0, wallId: "w3" },
      { id: "o5", type: "window", at: [14, 2.5], w: 1.5, wallId: "w2" },
      { id: "o6", type: "window", at: [14, 7.5], w: 1.5, wallId: "w2" },
    ],
    items: [
      { id: "i1", kind: "sofa", x: 3.5, z: 7, rot: 0 },
      { id: "i2", kind: "tv", x: 3.5, z: 9.5, rot: 0 },
      { id: "i3", kind: "kitchen", x: 3.5, z: 1.5, rot: 0 },
      { id: "i4", kind: "bed", x: 10.5, z: 2.5, rot: 0 },
      { id: "i5", kind: "bed", x: 10.5, z: 7.5, rot: 0 },
      { id: "i6", kind: "plant", x: 0.8, z: 8.5, rot: 0 },
    ],
  };
}

function office(): Scene {
  return {
    unit: "m",
    canvas: { widthM: 14, depthM: 10, gridStep: 0.1 },
    walls: [
      { id: "w1", a: [0, 0], b: [14, 0] },
      { id: "w2", a: [14, 0], b: [14, 10] },
      { id: "w3", a: [14, 10], b: [0, 10] },
      { id: "w4", a: [0, 10], b: [0, 0] },
      { id: "w5", a: [7, 0], b: [7, 10] },
    ],
    rooms: [
      { id: "r1", name: "Open Office", x: 0, z: 0, w: 7, d: 10, materialId: "polished-concrete" },
      { id: "r2", name: "Conference Room", x: 7, z: 0, w: 7, d: 10, materialId: "cozy-carpet" },
    ],
    openings: [
      { id: "o1", type: "door", at: [3.5, 0], w: 1.0, wallId: "w1" },
      { id: "o2", type: "door", at: [7, 5], w: 0.9, wallId: "w5" },
      { id: "o3", type: "window", at: [14, 5], w: 2.0, wallId: "w2" },
    ],
    items: [
      { id: "i1", kind: "table", x: 3.5, z: 4, rot: 0 },
      { id: "i2", kind: "chair", x: 3.5, z: 3.2, rot: 0 },
      { id: "i3", kind: "table", x: 10.5, z: 5, rot: 0 },
      { id: "i4", kind: "plant", x: 1, z: 1, rot: 0 },
    ],
  };
}

export const PLAN_TEMPLATES: PlanTemplate[] = [
  { id: "studio", label: "Studio", hint: "35 m² · 1 room + bath", build: studio },
  { id: "one-bed", label: "1-bed flat", hint: "80 m² · 2 rooms", build: oneBed },
  { id: "two-bed", label: "2-bed flat", hint: "140 m² · 3 rooms", build: twoBed },
  { id: "office", label: "Small office", hint: "140 m² · 2 rooms", build: office },
];

/** Offline fallback for the AI plan generator: pick the closest starter plan for a prompt. */
export function planFromPrompt(prompt: string): { scene: Scene; template: PlanTemplate } {
  const p = prompt.toLowerCase();
  const pick = (id: string) => PLAN_TEMPLATES.find((t) => t.id === id)!;
  let template = pick("one-bed");
  if (/office|workspace|conference|meeting/.test(p)) template = pick("office");
  else if (/\b(2|two|3|three)[ -]?bed/.test(p) || /family/.test(p)) template = pick("two-bed");
  else if (/studio|bedsit|tiny|micro/.test(p)) template = pick("studio");
  return { scene: template.build(), template };
}
