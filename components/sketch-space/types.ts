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
  materialId?: string; // textured finish (builtin or project material id)
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
  w?: number;                 // custom footprint width (m), overrides FURNITURE_SIZES
  d?: number;                 // custom footprint depth (m)
  h?: number;                 // custom height (m)
  color?: number;             // hex finish colour
  name?: string;              // user-facing name
}

/** Real footprint [width, depth] of an item in metres, before `scale`. */
export function itemSize(item: Pick<Item, "kind" | "w" | "d">): [number, number] {
  const [w, d] = FURNITURE_SIZES[item.kind];
  return [item.w ?? w, item.d ?? d];
}

/** Default heights (m) used by the 3D builder when `h` is not set. */
export const FURNITURE_HEIGHTS: Record<FurnitureKind, number> = {
  bed: 0.55, sofa: 0.85, table: 0.75, kitchen: 0.9, toilet: 0.8, bath: 0.6,
  stairs: 2.7, plant: 1.1, tv: 0.55, rug: 0.015, chair: 0.85, wardrobe: 2.1, label: 0,
};

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
  category?: "floor" | "wall" | "any";
  textureUrl?: string;
  color?: string;
  previewColor?: string;
  roughness: number;
  metalness: number;
  /** Real-world width/height (m) covered by one repeat of the texture. */
  tileM: number;
  /** @deprecated kept for older saved data; use tileM. */
  repeatPerMetre?: number;
}

/** A user-imported (or AI-declared) PBR material stored once in the project. */
export interface CustomMaterial {
  id: string;
  name: string;
  category: "floor" | "wall" | "any";
  albedo?: string;        // data:image/... or https:// colour map
  normal?: string;        // optional normal map (OpenGL / +Y)
  roughnessMap?: string;  // optional roughness map (greyscale)
  color?: string;         // "#rrggbb" tint, or flat colour when no albedo
  tileM: number;          // real-world size of one texture repeat (m)
  roughness: number;      // 0–1
  metalness: number;      // 0–1
}

export const BUILTIN_MATERIALS: MaterialPreset[] = [
  { id: "oak-wood", name: "Oak Planks", category: "floor", previewColor: "#c49a64", roughness: 0.55, metalness: 0, tileM: 1.2 },
  { id: "walnut-wood", name: "Walnut Planks", category: "floor", previewColor: "#6b4a33", roughness: 0.5, metalness: 0, tileM: 1.2 },
  { id: "herringbone-oak", name: "Herringbone Oak", category: "floor", previewColor: "#b98c58", roughness: 0.5, metalness: 0, tileM: 1.2 },
  { id: "polished-concrete", name: "Polished Concrete", category: "any", previewColor: "#9a9d9f", roughness: 0.4, metalness: 0, tileM: 3 },
  { id: "marble-tile", name: "Carrara Marble Tile", category: "floor", previewColor: "#e7e7e4", roughness: 0.2, metalness: 0, tileM: 1.2 },
  { id: "slate-tile", name: "Slate Tile", category: "floor", previewColor: "#3d4246", roughness: 0.75, metalness: 0, tileM: 1.2 },
  { id: "ceramic-tile", name: "White Ceramic Tile", category: "any", previewColor: "#eeeeea", roughness: 0.18, metalness: 0, tileM: 0.6 },
  { id: "terrazzo", name: "Terrazzo", category: "floor", previewColor: "#ddd6cb", roughness: 0.3, metalness: 0, tileM: 1 },
  { id: "cozy-carpet", name: "Wool Carpet", category: "floor", previewColor: "#cfc4b8", roughness: 0.95, metalness: 0, tileM: 0.5 },
  { id: "white-plaster", name: "White Plaster", category: "wall", previewColor: "#efeeea", roughness: 0.9, metalness: 0, tileM: 2 },
  { id: "limewash", name: "Warm Limewash", category: "wall", previewColor: "#e2d6c3", roughness: 0.92, metalness: 0, tileM: 2.5 },
  { id: "sage-paint", name: "Sage Paint", category: "wall", previewColor: "#8d9e88", roughness: 0.85, metalness: 0, tileM: 2 },
  { id: "exposed-brick", name: "Red Brick", category: "wall", previewColor: "#9a4f3a", roughness: 0.85, metalness: 0, tileM: 0.9 },
  { id: "subway-tile", name: "Subway Tile", category: "wall", previewColor: "#f1f0ec", roughness: 0.15, metalness: 0, tileM: 0.6 },
  { id: "warm-wood-panel", name: "Timber Slats", category: "wall", previewColor: "#8a6345", roughness: 0.6, metalness: 0, tileM: 0.6 },
];

export function builtinMaterial(id: string): MaterialPreset | undefined {
  return BUILTIN_MATERIALS.find((m) => m.id === id);
}

export interface TraceReference {
  name: string;
  dataUrl: string;
  center: Vec2;
  widthM: number;
  depthM: number;
  opacity: number;
  visible: boolean;
  calibrated?: boolean;
}

export interface Scene {
  reference?: TraceReference;
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
  id?: string;
  unit: "m";
  name?: string;
  activeFloorId: string;
  floors: FloorLevel[];
  materials?: CustomMaterial[]; // imported / AI-declared PBR materials
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
  | "box-select"
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
