// Scene model — field names must match what the Roomwright API reads.
export type Vec2 = [number, number]; // [x, z] in metres

// ── Canvas / project bounds ──────────────────────────────────────────────────
export interface CanvasBounds {
  widthM: number;   // metres
  depthM: number;
  gridStep: number; // snap resolution, default 0.1 m
}

export interface Wall {
  id: string;
  a: Vec2;
  b: Vec2;
  height?: number;     // overrides WALL_HEIGHT when set
  thickness?: number;  // overrides WALL_THICKNESS
  color?: number;      // hex, optional custom material
}

export interface Room {
  id: string;
  name: string;
  x: number;
  z: number;
  w: number;
  d: number;
  materialId?: string;      // floor texture
  wallMaterialId?: string;  // wall texture
}

export interface Opening {
  id: string;
  type: "door" | "window";
  at: Vec2;
  w: number;
  h?: number;           // opening height in m
  sillHeight?: number;  // for windows: height from floor
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
  scale?: number;             // uniform scale, default 1.0
  label?: string;             // for text labels
  connectsToFloorId?: string; // for stairs linking floors
}

// ── Virtual cameras ───────────────────────────────────────────────────────────
export interface VirtualCamera {
  id: string;
  name: string;
  position: Vec2;       // [x, z] in top view
  heightM: number;      // Y elevation
  targetPosition: Vec2; // look-at point [x, z]
  fov: number;          // degrees (30–90)
}

// ── Material presets ──────────────────────────────────────────────────────────
export interface MaterialPreset {
  id: string;
  name: string;
  category?: "floor" | "wall";
  textureUrl?: string;
  color?: string;
  previewColor?: string;
  roughness: number;
  metalness: number;
  repeatPerMetre: number;
}

export const BUILTIN_MATERIALS: MaterialPreset[] = [
  {
    id: "oak-wood",
    name: "Oak Hardwood",
    category: "floor",
    previewColor: "#c89d66",
    roughness: 0.4,
    metalness: 0.05,
    repeatPerMetre: 1.5,
  },
  {
    id: "polished-concrete",
    name: "Polished Concrete",
    category: "floor",
    previewColor: "#9ca3af",
    roughness: 0.25,
    metalness: 0.1,
    repeatPerMetre: 1.0,
  },
  {
    id: "marble-tile",
    name: "White Carrara Marble",
    category: "floor",
    previewColor: "#e5e7eb",
    roughness: 0.15,
    metalness: 0.05,
    repeatPerMetre: 1.2,
  },
  {
    id: "slate-tile",
    name: "Dark Slate Tile",
    category: "floor",
    previewColor: "#374151",
    roughness: 0.6,
    metalness: 0.05,
    repeatPerMetre: 1.0,
  },
  {
    id: "cozy-carpet",
    name: "Cozy Wool Carpet",
    category: "floor",
    previewColor: "#d1c7bd",
    roughness: 0.85,
    metalness: 0.0,
    repeatPerMetre: 2.0,
  },
  {
    id: "white-plaster",
    name: "Clean White Plaster",
    category: "wall",
    previewColor: "#f3f4f6",
    roughness: 0.7,
    metalness: 0.0,
    repeatPerMetre: 1.0,
  },
  {
    id: "exposed-brick",
    name: "Red Brickwork",
    category: "wall",
    previewColor: "#994d38",
    roughness: 0.8,
    metalness: 0.0,
    repeatPerMetre: 1.5,
  },
  {
    id: "warm-wood-panel",
    name: "Vertical Timber Slats",
    category: "wall",
    previewColor: "#8d6446",
    roughness: 0.45,
    metalness: 0.05,
    repeatPerMetre: 2.0,
  },
];

export interface Scene {
  unit: "m";
  canvas?: CanvasBounds;          // project extents
  walls: Wall[];
  rooms: Room[];
  openings: Opening[];
  items: Item[];
  virtualCameras?: VirtualCamera[];
}

export function emptyScene(): Scene {
  return {
    unit: "m",
    canvas: { widthM: 16, depthM: 12, gridStep: 0.1 },
    walls: [],
    rooms: [],
    openings: [],
    items: [],
  };
}

// ── Multi-floor Project Model ────────────────────────────────────────────────
export interface FloorLevel {
  id: string;
  name: string;
  elevationM: number;
  scene: Scene;
}

export interface Project {
  unit: "m";
  name?: string;
  activeFloorId: string;
  floors: FloorLevel[];
}

export function activeFloor(project: Project): Scene {
  const found = project.floors.find((f) => f.id === project.activeFloorId);
  return found ? found.scene : project.floors[0]?.scene ?? emptyScene();
}

export function emptyProject(): Project {
  const initialFloorId = "floor-0";
  return {
    unit: "m",
    name: "Untitled Project",
    activeFloorId: initialFloorId,
    floors: [
      {
        id: initialFloorId,
        name: "Ground Floor",
        elevationM: 0,
        scene: emptyScene(),
      },
    ],
  };
}

export function isProject(data: unknown): data is Project {
  if (!data || typeof data !== "object") return false;
  const p = data as Record<string, unknown>;
  return p.unit === "m" && Array.isArray(p.floors) && typeof p.activeFloorId === "string";
}

export type GizmoMode = "translate" | "rotate" | "scale";

export type ToolKind =
  | "select"
  | "wall"
  | "room"
  | "door"
  | "window"
  | "furniture"
  | "label"
  | "eraser"
  | "camera";

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

// ── Scene schema for LLM pipelines ────────────────────────────────────────────
export const SCENE_SCHEMA_EXAMPLE = JSON.stringify({
  unit: "m",
  walls: [{ id: "w1", a: [0, 0], b: [5, 0] }],
  rooms: [{ id: "r1", name: "Living Room", x: 0, z: 0, w: 5, d: 4 }],
  openings: [{ id: "o1", type: "door", at: [2.5, 0], w: 0.9, wallId: "w1" }],
  items: [{ id: "i1", kind: "sofa", x: 2.5, z: 2, rot: 0 }],
}, null, 2);

export function isValidScene(scene: unknown): scene is Scene {
  if (!scene || typeof scene !== "object") return false;
  const s = scene as Record<string, unknown>;
  if (s.unit !== "m") return false;
  if (!Array.isArray(s.walls) || !Array.isArray(s.rooms) ||
      !Array.isArray(s.openings) || !Array.isArray(s.items)) return false;
  // Validate wall references in openings
  const wallIds = new Set((s.walls as Array<{ id: string }>).map((w) => w.id));
  for (const o of s.openings as Array<{ wallId?: string; at: unknown; w: unknown }>) {
    if (o.wallId && !wallIds.has(o.wallId)) return false;
    if (!Array.isArray(o.at) || o.at.length !== 2) return false;
    if (typeof o.w !== "number" || !isFinite(o.w)) return false;
  }
  // Validate item kinds
  const validKinds: string[] = [
    "bed", "sofa", "table", "kitchen", "toilet", "bath",
    "stairs", "plant", "tv", "rug", "chair", "wardrobe", "label",
  ];
  for (const it of s.items as Array<{ kind: string; x: unknown; z: unknown }>) {
    if (!validKinds.includes(it.kind)) return false;
    if (typeof it.x !== "number" || !isFinite(it.x)) return false;
    if (typeof it.z !== "number" || !isFinite(it.z)) return false;
  }
  return true;
}

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
