// Scene model — field names must match what the Roomwright API reads.
export type Vec2 = [number, number]; // [x, z] in metres

export interface Wall {
  id: string;
  a: Vec2;
  b: Vec2;
}

export interface Room {
  id: string;
  name: string;
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface Opening {
  id: string;
  type: "door" | "window";
  at: Vec2;
  w: number;
  wallId?: string;
}

export type FurnitureKind =
  | "bed"
  | "sofa"
  | "table"
  | "kitchen"
  | "toilet"
  | "bath"
  | "stairs"
  | "plant"
  | "tv"
  | "rug"
  | "chair"
  | "wardrobe"
  | "label";

export interface Item {
  id: string;
  kind: FurnitureKind;
  x: number;
  z: number;
  rot: number; // radians
  label?: string; // for text labels
}

export interface Scene {
  unit: "m";
  walls: Wall[];
  rooms: Room[];
  openings: Opening[];
  items: Item[];
}

export function emptyScene(): Scene {
  return { unit: "m", walls: [], rooms: [], openings: [], items: [] };
}

export type ToolKind =
  | "select"
  | "wall"
  | "room"
  | "door"
  | "window"
  | "furniture"
  | "label"
  | "eraser";

export type ViewMode = "top" | "perspective" | "eye-level";

// Furniture real-world sizes [width, depth] in metres
export const FURNITURE_SIZES: Record<FurnitureKind, [number, number]> = {
  bed: [1.6, 2.0],
  sofa: [2.0, 0.9],
  table: [1.2, 0.8],
  kitchen: [3.0, 0.6],
  toilet: [0.45, 0.75],
  bath: [0.75, 1.7],
  stairs: [0.9, 3.0],
  plant: [0.4, 0.4],
  tv: [1.2, 0.3],
  rug: [2.0, 3.0],
  chair: [0.5, 0.5],
  wardrobe: [1.2, 0.6],
  label: [0, 0],
};

export const SNAP_GRID = 0.1; // metres
export const WALL_HEIGHT = 2.7; // metres
export const WALL_THICKNESS = 0.15; // metres
export const EYE_LEVEL = 1.6; // metres

export interface RenderRequest {
  images: Array<{ data: string; mime: string }>;
  plan: string;
  look: "plan3d" | "room" | "marker" | "clean2d" | "iso";
  style?: string;
  light?: string;
  room?: string;
  notes?: string;
  aspect?: string;
  model?: string;
}

export interface RenderResponse {
  image: string;
  mime: string;
  model: string;
  fallbackUsed?: boolean;
}

export interface RenderError {
  kind: "quota" | "rate" | "auth" | "generic";
  message: string;
  retryAfter?: number;
}
