/**
 * AI JSON → Sketch Space project.
 *
 * Accepts the JSON that ChatGPT / Claude / Gemini (or a person) writes from
 * the prompt below, and is forgiving about the usual variations: code fences,
 * comments, trailing commas, missing ids, other units, degrees vs radians,
 * synonyms ("couch", "desk"), rooms without walls, doors described as
 * "between Kitchen and Hall", windows as "Bedroom, north side", etc.
 * Native exported project / scene files are accepted unchanged.
 */
import { BUILTIN_MATERIALS, FURNITURE_SIZES, type CustomMaterial, type FurnitureKind, type Item, type Opening, type Project, type Room, type Scene, type Vec2, type VirtualCamera, type Wall } from "./types";
import { parseProject, validateMaterials } from "./project-data";

export interface AiBuildResult {
  project: Project;
  warnings: string[];
  stats: { floors: number; rooms: number; walls: number; openings: number; items: number; materials: number };
}

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => !!v && typeof v === "object" && !Array.isArray(v);

// ── Text clean-up ────────────────────────────────────────────────────────────
/** Strip fences, comments, trailing commas and Python literals outside strings. */
export function cleanJsonText(input: string): string {
  let text = input.trim();
  const fence = text.match(/```(?:json|JSON|jsonc)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  const start = text.search(/[{[]/);
  if (start > 0) text = text.slice(start);
  const lastBrace = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (lastBrace >= 0) text = text.slice(0, lastBrace + 1);
  let out = "", i = 0, inStr = false;
  while (i < text.length) {
    const c = text[i];
    if (inStr) {
      out += c;
      if (c === "\\") { out += text[i + 1] ?? ""; i += 2; continue; }
      if (c === '"') inStr = false;
      i++; continue;
    }
    if (c === '"') { inStr = true; out += c; i++; continue; }
    if (c === "/" && text[i + 1] === "/") { while (i < text.length && text[i] !== "\n") i++; continue; }
    if (c === "/" && text[i + 1] === "*") { const end = text.indexOf("*/", i + 2); i = end < 0 ? text.length : end + 2; continue; }
    if (c === ",") {
      let j = i + 1;
      while (j < text.length && /\s/.test(text[j])) j++;
      if (text[j] === "}" || text[j] === "]") { i++; continue; }
    }
    const word = text.slice(i).match(/^(True|False|None|NaN|undefined)\b/);
    if (word && !/[\w$]/.test(text[i - 1] ?? "")) { out += { True: "true", False: "false", None: "null", NaN: "null", undefined: "null" }[word[1]]; i += word[1].length; continue; }
    out += c; i++;
  }
  return out;
}

// ── Vocabulary ───────────────────────────────────────────────────────────────
const KIND_SYNONYMS: Record<string, FurnitureKind> = {
  bed: "bed", "double bed": "bed", "king bed": "bed", "queen bed": "bed", "single bed": "bed", bunk: "bed", crib: "bed", cot: "bed",
  sofa: "sofa", couch: "sofa", sectional: "sofa", loveseat: "sofa", settee: "sofa", armchair: "chair", "lounge chair": "chair",
  table: "table", "dining table": "table", desk: "table", "coffee table": "table", "side table": "table", nightstand: "table", "bedside table": "table", island: "kitchen", "kitchen island": "kitchen", console: "table",
  kitchen: "kitchen", counter: "kitchen", worktop: "kitchen", cabinets: "kitchen", "kitchen counter": "kitchen", fridge: "kitchen", refrigerator: "kitchen", stove: "kitchen", oven: "kitchen", sink: "kitchen", dishwasher: "kitchen",
  toilet: "toilet", wc: "toilet", bidet: "toilet",
  bath: "bath", bathtub: "bath", tub: "bath", shower: "bath",
  stairs: "stairs", staircase: "stairs", stair: "stairs",
  plant: "plant", tree: "plant", "potted plant": "plant", flowers: "plant",
  tv: "tv", television: "tv", "tv unit": "tv", "media unit": "tv", screen: "tv",
  rug: "rug", carpet: "rug", mat: "rug",
  chair: "chair", stool: "chair", "dining chair": "chair", "office chair": "chair", bench: "chair",
  wardrobe: "wardrobe", closet: "wardrobe", cupboard: "wardrobe", dresser: "wardrobe", bookshelf: "wardrobe", bookcase: "wardrobe", shelf: "wardrobe", shelving: "wardrobe", cabinet: "wardrobe", "chest of drawers": "wardrobe", washer: "wardrobe", "washing machine": "wardrobe",
  label: "label", text: "label", note: "label",
};

const MATERIAL_SYNONYMS: Array<[RegExp, string]> = [
  [/herring|chevron|parquet/, "herringbone-oak"], [/walnut|dark wood|espresso/, "walnut-wood"], [/oak|wood|timber floor|hardwood|laminate|plank/, "oak-wood"],
  [/concrete|cement|screed|microcement/, "polished-concrete"], [/marble|carrara|calacatta/, "marble-tile"], [/slate|stone|granite|basalt/, "slate-tile"],
  [/subway|metro tile|splashback/, "subway-tile"], [/ceramic|porcelain|tile|tiled/, "ceramic-tile"], [/terrazzo/, "terrazzo"], [/carpet|wool|rug/, "cozy-carpet"],
  [/brick/, "exposed-brick"], [/slat|panel|cladding|timber wall/, "warm-wood-panel"], [/lime|warm|cream|beige|clay/, "limewash"], [/sage|green|olive/, "sage-paint"],
  [/plaster|paint|white|drywall|gypsum/, "white-plaster"],
];

const UNIT_FACTORS: Record<string, number> = { m: 1, meter: 1, meters: 1, metre: 1, metres: 1, cm: 0.01, mm: 0.001, ft: 0.3048, feet: 0.3048, foot: 0.3048, in: 0.0254, inch: 0.0254, inches: 0.0254 };

// ── Prompt for external AIs ──────────────────────────────────────────────────
export function buildAiPrompt(brief = ""): string {
  const kinds = (Object.keys(FURNITURE_SIZES) as FurnitureKind[]).filter(k => k !== "label").map(k => `${k} (${FURNITURE_SIZES[k][0]}×${FURNITURE_SIZES[k][1]} m)`).join(", ");
  const floors = BUILTIN_MATERIALS.filter(m => m.category !== "wall").map(m => m.id).join(", ");
  const walls = BUILTIN_MATERIALS.filter(m => m.category !== "floor").map(m => m.id).join(", ");
  return `You are an architect. Design the floor plan described below and answer with ONE JSON object only (no prose, no markdown).

BRIEF: ${brief.trim() || "<describe the space: type, number of rooms, size, style>"}

COORDINATES
- Units are metres. Plan view: x grows to the right (east), z grows downward (south). North is -z.
- Rooms are axis-aligned rectangles {x, z, w, d}: (x, z) is the top-left (north-west) corner, w along x, d along z.
- Rooms must not overlap. Adjacent rooms share edges exactly (e.g. one ends at x=5, the next starts at x=5).
- Walls are generated automatically from the rooms; only add "walls" for extra partitions or non-rectangular parts.

SCHEMA
{
  "name": "Project name",
  "floors": [{
    "name": "Ground Floor",
    "elevationM": 0,
    "rooms": [{ "name": "Living Room", "x": 0, "z": 0, "w": 5, "d": 4, "floor": "<floor material>", "walls": "<wall material>" }],
    "walls": [{ "a": [x, z], "b": [x, z], "height": 2.7, "thickness": 0.15, "material": "<wall material>" }],
    "openings": [
      { "type": "door", "between": ["Living Room", "Kitchen"], "w": 0.9 },
      { "type": "door", "room": "Living Room", "side": "south", "offset": 1.5, "w": 1.0 },
      { "type": "window", "room": "Bedroom", "side": "north", "w": 1.6, "h": 1.3, "sillHeight": 0.9 }
    ],
    "items": [{ "kind": "sofa", "x": 2.5, "z": 3.2, "rotDeg": 0, "w": 2.2, "color": "#7d8c7a", "name": "3-seat sofa" }]
  }],
  "materials": [{ "id": "my-green-tile", "name": "Green tile", "category": "wall", "color": "#4f7a5a", "tileM": 0.6, "roughness": 0.3, "metalness": 0 }]
}

RULES
- "side" is north | south | east | west of that room. "offset" is metres from the room's west/north corner along that side; omit it to centre.
- Every room needs at least one door. Exterior rooms should get windows on outside walls.
- Item "x"/"z" is the item's centre in world coordinates; keep items inside their room and 0.6 m clear in front of doors.
- rotDeg sets which way the item's FRONT faces: 0 = south (+z, back against a north wall), 90 = east, 180 = north, 270 = west.
- Item kinds (default footprint): ${kinds}. "w", "d", "h" (metres) override the size.
- Floor materials: ${floors}.
- Wall materials: ${walls}.
- Custom "materials" may be referenced by id in "floor", "walls" or "material"; give "color" and optionally "albedo" (an https image URL).
- Use realistic sizes: bedrooms ≥ 9 m², corridors ≥ 1.0 m wide, doors 0.8–0.9 m (entrance 1.0 m), ceiling 2.6–2.8 m.
- Multi-storey: add more objects to "floors" with elevationM = 3 per storey and align stairs on both floors.`;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const round = (v: number) => Math.round(v * 1000) / 1000;

function makeId(prefix: string, used: Set<string>): string {
  let n = used.size + 1, id = `${prefix}${n}`;
  while (used.has(id)) id = `${prefix}${++n}`;
  used.add(id);
  return id;
}

function colorNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 0xffffff) return v;
  if (typeof v === "string") { const m = v.trim().match(/^#?([0-9a-f]{6}|[0-9a-f]{3})$/i); if (m) { const h = m[1].length === 3 ? m[1].split("").map(c => c + c).join("") : m[1]; return parseInt(h, 16); } }
  return undefined;
}
function colorHex(v: unknown): string | undefined {
  const n = colorNumber(v);
  return n === undefined ? undefined : `#${n.toString(16).padStart(6, "0")}`;
}

class Builder {
  warnings: string[] = [];
  factor = 1;
  materials: CustomMaterial[] = [];
  private materialIds = new Set<string>(BUILTIN_MATERIALS.map(m => m.id));

  warn(msg: string) { if (this.warnings.length < 40 && !this.warnings.includes(msg)) this.warnings.push(msg); }

  /** Length in metres from a number or string like "450cm", "12ft". */
  len(v: unknown): number | undefined {
    if (typeof v === "number" && Number.isFinite(v)) return v * this.factor;
    if (typeof v === "string") {
      const m = v.trim().match(/^(-?\d+(?:\.\d+)?)\s*([a-z]*)$/i);
      if (m) { const f = m[2] ? UNIT_FACTORS[m[2].toLowerCase()] : this.factor; if (f !== undefined) return parseFloat(m[1]) * f; }
    }
    return undefined;
  }
  num(v: unknown): number | undefined {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && Number.isFinite(+v)) return +v;
    return undefined;
  }
  pick(o: Rec, ...keys: string[]): unknown { for (const k of keys) if (o[k] !== undefined && o[k] !== null) return o[k]; return undefined; }

  /** [x, z] from [x, z], {x, z} or {x, y}. */
  point(v: unknown): Vec2 | undefined {
    if (Array.isArray(v) && v.length >= 2) { const x = this.len(v[0]), z = this.len(v[1]); return x !== undefined && z !== undefined ? [x, z] : undefined; }
    if (isRec(v)) { const x = this.len(v.x), z = this.len(v.z ?? v.y); return x !== undefined && z !== undefined ? [x, z] : undefined; }
    return undefined;
  }

  registerMaterials(list: unknown) {
    if (!Array.isArray(list)) return;
    for (const raw of list) {
      if (!isRec(raw)) continue;
      const id = String(raw.id ?? raw.name ?? "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 60);
      if (!id || this.materialIds.has(id)) { if (id) this.warn(`Material "${id}" is already defined; kept the first one.`); continue; }
      const url = (v: unknown) => typeof v === "string" && (/^https:\/\//.test(v) || /^data:image\/(png|jpeg|webp);base64,/.test(v)) ? v : undefined;
      const mat: CustomMaterial = {
        id, name: String(raw.name ?? id).slice(0, 80),
        category: ["floor", "wall"].includes(raw.category as string) ? raw.category as "floor" | "wall" : "any",
        albedo: url(raw.albedo ?? raw.texture ?? raw.textureUrl ?? raw.map), normal: url(raw.normal ?? raw.normalMap), roughnessMap: url(raw.roughnessMap),
        color: colorHex(raw.color), tileM: Math.max(0.05, Math.min(20, this.num(raw.tileM ?? raw.size ?? raw.tileSize) ?? 1)),
        roughness: Math.max(0, Math.min(1, this.num(raw.roughness) ?? 0.6)), metalness: Math.max(0, Math.min(1, this.num(raw.metalness) ?? 0)),
      };
      if (!mat.albedo && !mat.color) mat.color = "#cccccc";
      this.materials.push(mat); this.materialIds.add(id);
    }
  }

  /** Builtin / custom material id from an id or a loose description. */
  material(v: unknown, where: string): string | undefined {
    if (v === undefined || v === null || v === "") return undefined;
    if (isRec(v)) { this.registerMaterials([{ id: v.id ?? `${where}-${this.materials.length + 1}`, ...v }]); return this.materials.at(-1)?.id; }
    const s = String(v).trim();
    if (this.materialIds.has(s)) return s;
    const lower = s.toLowerCase();
    if (this.materialIds.has(lower)) return lower;
    const custom = this.materials.find(m => m.name.toLowerCase() === lower);
    if (custom) return custom.id;
    for (const [re, id] of MATERIAL_SYNONYMS) if (re.test(lower)) return id;
    const hex = colorHex(s);
    if (hex) { const id = `paint-${hex.slice(1)}`; if (!this.materialIds.has(id)) { this.materials.push({ id, name: `Paint ${hex}`, category: "any", color: hex, tileM: 2, roughness: 0.85, metalness: 0 }); this.materialIds.add(id); } return id; }
    this.warn(`Unknown material "${s}" on ${where} — left as default.`);
    return undefined;
  }

  kind(v: unknown): { kind: FurnitureKind; name?: string } {
    const s = String(v ?? "").trim().toLowerCase().replace(/[_-]+/g, " ");
    if (Object.hasOwn(FURNITURE_SIZES, s)) return { kind: s as FurnitureKind };
    if (KIND_SYNONYMS[s]) return { kind: KIND_SYNONYMS[s], name: String(v) };
    for (const [word, kind] of Object.entries(KIND_SYNONYMS)) if (s.includes(word)) return { kind, name: String(v) };
    this.warn(`Unknown furniture "${String(v)}" was placed as a generic block.`);
    return { kind: "table", name: String(v || "Object") };
  }

  // ── Scene ────────────────────────────────────────────────────────────────
  scene(raw: Rec, floorName: string): Scene {
    const used = new Set<string>();
    const claim = (v: unknown, prefix: string) => { const id = typeof v === "string" || typeof v === "number" ? String(v) : ""; if (id && !used.has(id)) { used.add(id); return id; } return makeId(prefix, used); };

    // Rooms
    const rooms: Room[] = [];
    const roomPolys: Vec2[][] = [];
    for (const r of Array.isArray(raw.rooms) ? raw.rooms : []) {
      if (!isRec(r)) continue;
      let x = this.len(this.pick(r, "x", "left")), z = this.len(this.pick(r, "z", "y", "top"));
      let w = this.len(this.pick(r, "w", "width", "sizeX")), d = this.len(this.pick(r, "d", "depth", "length", "sizeZ"));
      const rect = this.pick(r, "rect", "bounds");
      if (Array.isArray(rect) && rect.length === 4) [x, z, w, d] = rect.map(v => this.len(v)) as number[];
      const pos = this.point(this.pick(r, "position", "origin", "at"));
      if (pos && x === undefined) [x, z] = pos;
      const size = this.pick(r, "size", "dimensions");
      if (Array.isArray(size) && size.length >= 2) { w ??= this.len(size[0]); d ??= this.len(size[1]); }
      const center = this.point(this.pick(r, "center", "centre"));
      if (center && w !== undefined && d !== undefined && x === undefined) { x = center[0] - w / 2; z = center[1] - d / 2; }
      const poly = this.pick(r, "polygon", "points", "outline");
      if (Array.isArray(poly) && poly.length >= 3) {
        const pts = poly.map(p => this.point(p)).filter((p): p is Vec2 => !!p);
        if (pts.length >= 3) {
          const xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
          x = Math.min(...xs); z = Math.min(...zs); w = Math.max(...xs) - x; d = Math.max(...zs) - z;
          const isRect = pts.length === 4 && pts.every(p => (Math.abs(p[0] - x!) < .01 || Math.abs(p[0] - x! - w!) < .01) && (Math.abs(p[1] - z!) < .01 || Math.abs(p[1] - z! - d!) < .01));
          if (!isRect) roomPolys.push(pts);
        }
      }
      d ??= this.len(r.height); // 2D "height" means depth when depth is missing
      if ([x, z, w, d].some(v => v === undefined) || w! < 0.2 || d! < 0.2) { this.warn(`Skipped room "${String(r.name ?? "?")}" on ${floorName}: needs x, z, w, d in metres.`); continue; }
      if (w! < 0) { x! += w!; w = -w!; }
      const room: Room = { id: claim(r.id, "r"), name: String(r.name ?? r.label ?? r.type ?? `Room ${rooms.length + 1}`).slice(0, 80), x: round(x!), z: round(z!), w: round(w!), d: round(d!) };
      const fm = this.material(this.pick(r, "floor", "floorMaterial", "materialId", "flooring"), `room "${room.name}" floor`);
      if (fm) room.materialId = fm;
      const wm = this.material(this.pick(r, "walls", "wallMaterial", "wallMaterialId", "wallFinish"), `room "${room.name}" walls`);
      if (wm) room.wallMaterialId = wm;
      rooms.push(room);
    }

    // Walls (explicit)
    const walls: Wall[] = [];
    const wallIdMap = new Map<string, string>();
    const addWall = (a: Vec2, b: Vec2, src: Rec = {}) => {
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.05) return;
      const id = claim(src.id, "w");
      if (src.id !== undefined) wallIdMap.set(String(src.id), id);
      const wall: Wall = { id, a: [round(a[0]), round(a[1])], b: [round(b[0]), round(b[1])] };
      const h = this.len(this.pick(src, "height", "h")), t = this.len(this.pick(src, "thickness", "t", "width"));
      if (h && h > 0.3 && h < 20) wall.height = h;
      if (t && t > 0.02 && t < 1.5) wall.thickness = t;
      const color = colorNumber(src.color);
      if (color !== undefined) wall.color = color;
      const m = this.material(this.pick(src, "material", "materialId", "finish"), "a wall");
      if (m) wall.materialId = m;
      walls.push(wall);
    };
    for (const w of Array.isArray(raw.walls) ? raw.walls : []) {
      if (Array.isArray(w) && w.length === 4) { const [x1, z1, x2, z2] = w.map(v => this.len(v)); if ([x1, z1, x2, z2].every(v => v !== undefined)) addWall([x1!, z1!], [x2!, z2!]); continue; }
      if (Array.isArray(w) && w.length === 2) { const a = this.point(w[0]), b = this.point(w[1]); if (a && b) addWall(a, b); continue; }
      if (!isRec(w)) continue;
      const pts = this.pick(w, "points", "path", "polyline");
      if (Array.isArray(pts)) {
        const list = pts.map(p => this.point(p)).filter((p): p is Vec2 => !!p);
        for (let i = 0; i + 1 < list.length; i++) addWall(list[i], list[i + 1], { ...w, id: undefined });
        if (w.closed && list.length > 2) addWall(list.at(-1)!, list[0], { ...w, id: undefined });
        continue;
      }
      let a = this.point(this.pick(w, "a", "start", "from", "p1")), b = this.point(this.pick(w, "b", "end", "to", "p2"));
      if (!a) { const x1 = this.len(w.x1), z1 = this.len(w.z1 ?? w.y1); if (x1 !== undefined && z1 !== undefined) a = [x1, z1]; }
      if (!b) { const x2 = this.len(w.x2), z2 = this.len(w.z2 ?? w.y2); if (x2 !== undefined && z2 !== undefined) b = [x2, z2]; }
      if (a && b) addWall(a, b, w); else this.warn(`Skipped a wall on ${floorName}: needs "a" and "b" points.`);
    }

    // Auto walls from rooms (and non-rectangular room outlines)
    const autoWalls = raw.autoWalls !== false && (raw.autoWalls === true || walls.length === 0);
    if (autoWalls) {
      for (const pts of roomPolys) for (let i = 0; i < pts.length; i++) addWall(pts[i], pts[(i + 1) % pts.length]);
      for (const seg of roomEdgeWalls(rooms.filter((_, i) => !roomPolys[i]), walls)) addWall(seg[0], seg[1]);
    }
    // Room wall finishes → walls along that room's edges.
    for (const room of rooms) if (room.wallMaterialId) for (const w of walls) if (!w.materialId && onRoomEdge(room, w)) w.materialId = room.wallMaterialId;

    // Openings
    const openings: Opening[] = [];
    const findRoom = (n: unknown) => { const s = String(n ?? "").toLowerCase().trim(); return rooms.find(r => r.id.toLowerCase() === s || r.name.toLowerCase() === s) ?? rooms.find(r => r.name.toLowerCase().includes(s) && s.length > 2); };
    for (const o of Array.isArray(raw.openings) ? raw.openings : [...(Array.isArray(raw.doors) ? raw.doors.map(d => ({ type: "door", ...(isRec(d) ? d : {}) })) : []), ...(Array.isArray(raw.windows) ? raw.windows.map(d => ({ type: "window", ...(isRec(d) ? d : {}) })) : [])]) {
      if (!isRec(o)) continue;
      const typeText = String(o.type ?? o.kind ?? "door").toLowerCase();
      const type: Opening["type"] = /window|glaz|skylight/.test(typeText) ? "window" : "door";
      const width = this.len(this.pick(o, "w", "width")) ?? (type === "door" ? 0.9 : 1.2);
      let wall: Wall | undefined, at: Vec2 | undefined;
      const wallRef = this.pick(o, "wallId", "wall");
      if (typeof wallRef === "number" && walls[wallRef]) wall = walls[wallRef];
      else if (wallRef !== undefined) wall = walls.find(w => w.id === (wallIdMap.get(String(wallRef)) ?? String(wallRef)));
      at = this.point(this.pick(o, "at", "position", "center", "centre"));
      if (!at) { const x = this.len(o.x), z = this.len(o.z ?? o.y); if (x !== undefined && z !== undefined) at = [x, z]; }
      const between = this.pick(o, "between", "connects", "rooms");
      if (!wall && !at && Array.isArray(between) && between.length >= 2) {
        const r1 = findRoom(between[0]), r2 = findRoom(between[1]);
        const shared = r1 && r2 ? sharedEdge(r1, r2) : undefined;
        if (shared) { at = [(shared[0][0] + shared[1][0]) / 2, (shared[0][1] + shared[1][1]) / 2]; if (Math.hypot(shared[1][0] - shared[0][0], shared[1][1] - shared[0][1]) < width + 0.1) this.warn(`The wall between "${r1!.name}" and "${r2!.name}" is shorter than the door.`); }
        else this.warn(`No shared wall between "${String(between[0])}" and "${String(between[1])}" for a ${type}.`);
      }
      const room = findRoom(this.pick(o, "room", "in"));
      const side = String(this.pick(o, "side", "facing", "orientation", "direction") ?? "").toLowerCase();
      if (!wall && !at && room && side) {
        const offset = this.len(this.pick(o, "offset", "along"));
        const horizontal = /^(n|north|top|s|south|bottom|front|back)$/.test(side);
        const edgeLen = horizontal ? room.w : room.d;
        const t = offset ?? edgeLen / 2;
        if (/^(n|north|top|back)$/.test(side)) at = [room.x + t, room.z];
        else if (/^(s|south|bottom|front)$/.test(side)) at = [room.x + t, room.z + room.d];
        else if (/^(w|west|left)$/.test(side)) at = [room.x, room.z + t];
        else if (/^(e|east|right)$/.test(side)) at = [room.x + room.w, room.z + t];
        else this.warn(`Unknown side "${side}" for a ${type} in "${room.name}".`);
      }
      if (wall && !at) {
        const offset = this.len(this.pick(o, "offset", "along")), ratio = this.num(o.t);
        const L = Math.hypot(wall.b[0] - wall.a[0], wall.b[1] - wall.a[1]);
        const t = offset !== undefined ? offset / L : ratio ?? 0.5;
        at = [wall.a[0] + (wall.b[0] - wall.a[0]) * t, wall.a[1] + (wall.b[1] - wall.a[1]) * t];
      }
      if (!at) { this.warn(`Skipped a ${type} on ${floorName}: give "between", "room" + "side", or "at".`); continue; }
      if (!wall) wall = nearestWall(walls, at, 1.0);
      if (!wall) { this.warn(`Skipped a ${type} at (${at[0].toFixed(1)}, ${at[1].toFixed(1)}): no wall within 1 m.`); continue; }
      // Project onto the wall and keep the opening inside it.
      const dx = wall.b[0] - wall.a[0], dz = wall.b[1] - wall.a[1], L = Math.hypot(dx, dz);
      const ow = Math.min(width, Math.max(0.3, L - 0.1));
      let t = ((at[0] - wall.a[0]) * dx + (at[1] - wall.a[1]) * dz) / (L * L);
      const margin = ow / 2 / L; t = Math.max(margin, Math.min(1 - margin, t));
      const opening: Opening = { id: claim(o.id, "o"), type, at: [round(wall.a[0] + dx * t), round(wall.a[1] + dz * t)], w: round(ow), wallId: wall.id };
      const h = this.len(this.pick(o, "h", "height")), sill = this.len(this.pick(o, "sillHeight", "sill"));
      if (h && h > 0.2 && h < 5) opening.h = h;
      if (sill !== undefined && sill >= 0 && sill < 5) opening.sillHeight = sill;
      openings.push(opening);
    }

    // Items
    const items: Item[] = [];
    for (const it of Array.isArray(raw.items) ? raw.items : Array.isArray(raw.furniture) ? raw.furniture : []) {
      if (!isRec(it)) continue;
      const { kind, name } = this.kind(this.pick(it, "kind", "type", "name"));
      let pos = this.point(this.pick(it, "at", "position", "center", "centre"));
      if (!pos) { const x = this.len(it.x), z = this.len(it.z ?? it.y); if (x !== undefined && z !== undefined) pos = [x, z]; }
      const room = findRoom(this.pick(it, "room", "in"));
      if (pos && room && it.relative === true) pos = [room.x + pos[0], room.z + pos[1]];
      if (!pos && room) pos = [room.x + room.w / 2, room.z + room.d / 2];
      if (!pos) { this.warn(`Skipped "${name ?? kind}": needs x and z.`); continue; }
      let rot = 0;
      const deg = this.num(this.pick(it, "rotDeg", "rotation", "angle", "deg", "rotationDeg"));
      const rad = this.num(it.rot);
      if (deg !== undefined) rot = deg * Math.PI / 180;
      else if (rad !== undefined) rot = Math.abs(rad) > 2 * Math.PI + 0.01 ? rad * Math.PI / 180 : rad;
      const item: Item = { id: claim(it.id, "i"), kind, x: round(pos[0]), z: round(pos[1]), rot: round(rot) + 0 };
      const label = this.pick(it, "label", "text");
      if (kind === "label") item.label = String(label ?? name ?? "Label").slice(0, 120);
      const displayName = this.pick(it, "name", "title");
      if (typeof displayName === "string" && displayName.toLowerCase() !== kind) item.name = displayName.slice(0, 80);
      else if (name && name.toLowerCase() !== kind) item.name = name.slice(0, 80);
      const w = this.len(this.pick(it, "w", "width")), d = this.len(this.pick(it, "d", "depth", "length")), h = this.len(this.pick(it, "h", "height"));
      if (w && w > 0.05 && w < 30) item.w = round(w);
      if (d && d > 0.01 && d < 30) item.d = round(d);
      if (h && h > 0.005 && h < 10) item.h = round(h);
      const scale = this.num(it.scale);
      if (scale && scale > 0.05 && scale < 10) item.scale = scale;
      const color = colorNumber(it.color);
      if (color !== undefined) item.color = color;
      items.push(item);
    }

    const scene: Scene = { unit: "m", walls, rooms, openings, items };
    const cams = Array.isArray(raw.virtualCameras) ? raw.virtualCameras.filter((c): c is VirtualCamera => isRec(c) && typeof c.id === "string" && Array.isArray(c.position) && Array.isArray(c.targetPosition)) : [];
    if (cams.length) scene.virtualCameras = cams.map(c => ({ ...c, id: claim(c.id, "cam") }));
    if (isRec(raw.reference)) scene.reference = raw.reference as unknown as Scene["reference"];
    // Canvas: fit everything with a 2 m margin (or the given size if larger).
    const xs = [...walls.flatMap(w => [w.a[0], w.b[0]]), ...rooms.flatMap(r => [r.x, r.x + r.w]), ...items.map(i => i.x)];
    const zs = [...walls.flatMap(w => [w.a[1], w.b[1]]), ...rooms.flatMap(r => [r.z, r.z + r.d]), ...items.map(i => i.z)];
    const canvas = isRec(raw.canvas) ? raw.canvas : {};
    const span = (v: number[]) => v.length ? Math.max(...v) - Math.min(...v) : 0;
    scene.canvas = {
      widthM: Math.ceil(Math.max(this.len(canvas.widthM ?? canvas.width) ?? 0, span(xs) + 4, 8)),
      depthM: Math.ceil(Math.max(this.len(canvas.depthM ?? canvas.depth) ?? 0, span(zs) + 4, 6)),
      gridStep: this.num(canvas.gridStep) ?? 0.1,
    };
    return scene;
  }
}

// ── Geometry helpers ─────────────────────────────────────────────────────────
function onRoomEdge(r: Room, w: Wall): boolean {
  const vertical = Math.abs(w.a[0] - w.b[0]) < .01, horizontal = Math.abs(w.a[1] - w.b[1]) < .01;
  if (vertical && (Math.abs(w.a[0] - r.x) < .01 || Math.abs(w.a[0] - r.x - r.w) < .01)) return Math.min(w.a[1], w.b[1]) >= r.z - .01 && Math.max(w.a[1], w.b[1]) <= r.z + r.d + .01;
  if (horizontal && (Math.abs(w.a[1] - r.z) < .01 || Math.abs(w.a[1] - r.z - r.d) < .01)) return Math.min(w.a[0], w.b[0]) >= r.x - .01 && Math.max(w.a[0], w.b[0]) <= r.x + r.w + .01;
  return false;
}

/** Shared edge segment of two touching rooms, if any. */
function sharedEdge(a: Room, b: Room): [Vec2, Vec2] | undefined {
  const eq = (p: number, q: number) => Math.abs(p - q) < .02;
  const overlap = (a0: number, a1: number, b0: number, b1: number) => [Math.max(a0, b0), Math.min(a1, b1)] as const;
  for (const [xa, xb] of [[a.x + a.w, b.x], [a.x, b.x + b.w]] as const) if (eq(xa, xb)) { const [z0, z1] = overlap(a.z, a.z + a.d, b.z, b.z + b.d); if (z1 - z0 > .3) return [[xa, z0], [xa, z1]]; }
  for (const [za, zb] of [[a.z + a.d, b.z], [a.z, b.z + b.d]] as const) if (eq(za, zb)) { const [x0, x1] = overlap(a.x, a.x + a.w, b.x, b.x + b.w); if (x1 - x0 > .3) return [[x0, za], [x1, za]]; }
  return undefined;
}

function nearestWall(walls: Wall[], p: Vec2, max: number): Wall | undefined {
  let best: Wall | undefined, bestD = max;
  for (const w of walls) {
    const dx = w.b[0] - w.a[0], dz = w.b[1] - w.a[1];
    const t = Math.max(0, Math.min(1, ((p[0] - w.a[0]) * dx + (p[1] - w.a[1]) * dz) / (dx * dx + dz * dz || 1)));
    const d = Math.hypot(p[0] - w.a[0] - t * dx, p[1] - w.a[1] - t * dz);
    if (d < bestD) { bestD = d; best = w; }
  }
  return best;
}

/**
 * Wall segments along room edges: overlapping edges of neighbouring rooms are
 * merged, then split at every room corner on that line (so each room side is
 * its own wall), skipping stretches already covered by explicit walls.
 */
function roomEdgeWalls(rooms: Room[], existing: Wall[]): Array<[Vec2, Vec2]> {
  const key = (v: number) => Math.round(v * 100) / 100;
  const lines = new Map<string, { axis: "x" | "z"; at: number; spans: Array<[number, number]>; cuts: Set<number> }>();
  const add = (axis: "x" | "z", at: number, s0: number, s1: number) => {
    const k = `${axis}:${key(at)}`;
    const line = lines.get(k) ?? { axis, at: key(at), spans: [], cuts: new Set<number>() };
    line.spans.push([key(Math.min(s0, s1)), key(Math.max(s0, s1))]);
    lines.set(k, line);
  };
  for (const r of rooms) { add("z", r.z, r.x, r.x + r.w); add("z", r.z + r.d, r.x, r.x + r.w); add("x", r.x, r.z, r.z + r.d); add("x", r.x + r.w, r.z, r.z + r.d); }
  for (const r of rooms) for (const line of lines.values()) {
    if (line.axis === "z" && (key(r.z) === line.at || key(r.z + r.d) === line.at)) { line.cuts.add(key(r.x)); line.cuts.add(key(r.x + r.w)); }
    if (line.axis === "x" && (key(r.x) === line.at || key(r.x + r.w) === line.at)) { line.cuts.add(key(r.z)); line.cuts.add(key(r.z + r.d)); }
  }
  const covered = (axis: "x" | "z", at: number, s0: number, s1: number) => existing.some(w => {
    const p = axis === "z" ? [w.a[1], w.b[1], w.a[0], w.b[0]] : [w.a[0], w.b[0], w.a[1], w.b[1]];
    return Math.abs(p[0] - at) < .02 && Math.abs(p[1] - at) < .02 && Math.min(p[2], p[3]) <= s0 + .02 && Math.max(p[2], p[3]) >= s1 - .02;
  });
  const out: Array<[Vec2, Vec2]> = [];
  for (const line of lines.values()) {
    const spans = line.spans.sort((a, b) => a[0] - b[0]);
    const merged: Array<[number, number]> = [];
    for (const s of spans) { const last = merged.at(-1); if (last && s[0] <= last[1] + .01) last[1] = Math.max(last[1], s[1]); else merged.push([...s]); }
    const cuts = [...line.cuts].sort((a, b) => a - b);
    for (const [m0, m1] of merged) {
      const pts = [m0, ...cuts.filter(c => c > m0 + .01 && c < m1 - .01), m1];
      for (let i = 0; i + 1 < pts.length; i++) {
        if (covered(line.axis, line.at, pts[i], pts[i + 1])) continue;
        out.push(line.axis === "z" ? [[pts[i], line.at], [pts[i + 1], line.at]] : [[line.at, pts[i]], [line.at, pts[i + 1]]]);
      }
    }
  }
  return out;
}

// ── Entry point ──────────────────────────────────────────────────────────────
/** Parse AI / hand-written JSON text into a validated project. Throws with a readable message. */
export function buildProjectFromAiJson(text: string): AiBuildResult {
  if (!text.trim()) throw new Error("Paste the JSON from your AI first.");
  let data: unknown;
  try { data = JSON.parse(cleanJsonText(text)); }
  catch (e) { throw new Error(`This is not valid JSON${e instanceof Error ? ` (${e.message.replace(/^JSON\.parse: /, "")})` : ""}. Ask the AI to return only the JSON object.`); }
  if (Array.isArray(data)) data = { rooms: data };
  if (!isRec(data)) throw new Error("Expected a JSON object like { \"rooms\": [...] }.");
  // Some AIs wrap the answer: { "plan": {...} } / { "project": {...} }.
  for (const k of ["project", "plan", "floorPlan", "floorplan", "layout", "scene", "design"]) if (isRec(data[k]) && !data.rooms && !data.floors && !data.walls) { data = data[k]; break; }
  const root = data as Rec;

  // Native exports pass straight through the strict parser.
  try { if (root.unit === "m" && (Array.isArray(root.floors) || Array.isArray(root.walls))) { const project = parseProject(root); return { project, warnings: [], stats: statsOf(project) }; } } catch { /* fall back to lenient path */ }

  const b = new Builder();
  const unit = String(root.unit ?? root.units ?? "m").toLowerCase();
  b.factor = UNIT_FACTORS[unit] ?? 1;
  if (!UNIT_FACTORS[unit]) b.warn(`Unknown unit "${unit}" — treated as metres.`);
  b.registerMaterials(root.materials);

  const floorsRaw: Rec[] = Array.isArray(root.floors) ? root.floors.filter(isRec) : Array.isArray(root.levels) ? root.levels.filter(isRec) : [root];
  if (!floorsRaw.length) throw new Error("No floors or rooms found in this JSON.");
  const usedFloorIds = new Set<string>();
  const floors = floorsRaw.slice(0, 50).map((f, i) => {
    const name = String(f.name ?? f.level ?? (i === 0 ? "Ground Floor" : `Floor ${i + 1}`)).slice(0, 80);
    const id = typeof f.id === "string" && !usedFloorIds.has(f.id) ? f.id : makeId("floor-", usedFloorIds);
    usedFloorIds.add(id);
    return { id, name, elevationM: b.len(b.pick(f, "elevationM", "elevation", "heightAboveGround")) ?? i * 3, scene: b.scene(f, name) };
  });
  const totals = floors.reduce((n, f) => n + f.scene.walls.length + f.scene.rooms.length + f.scene.items.length, 0);
  if (!totals) throw new Error(`Nothing could be built from this JSON.${b.warnings.length ? " " + b.warnings.slice(0, 3).join(" ") : " Add \"rooms\" with x, z, w, d."}`);
  // Share one canvas size across floors so storeys line up.
  const widthM = Math.max(...floors.map(f => f.scene.canvas!.widthM)), depthM = Math.max(...floors.map(f => f.scene.canvas!.depthM));
  floors.forEach(f => { f.scene.canvas = { ...f.scene.canvas!, widthM, depthM }; });

  const project: Project = { unit: "m", name: typeof root.name === "string" ? root.name.slice(0, 80) : undefined, activeFloorId: floors[0].id, floors };
  const usedIds = new Set(b.materials.map(m => m.id));
  const materials = b.materials.filter(m => usedIds.has(m.id));
  if (materials.length) {
    if (!validateMaterials(materials)) throw new Error("A custom material is invalid (check its colour, tileM and image URLs).");
    project.materials = materials;
  }
  const parsed = parseProject(project);
  return { project: parsed, warnings: b.warnings, stats: statsOf(parsed) };
}

function statsOf(p: Project): AiBuildResult["stats"] {
  const sum = (k: "rooms" | "walls" | "openings" | "items") => p.floors.reduce((n, f) => n + f.scene[k].length, 0);
  return { floors: p.floors.length, rooms: sum("rooms"), walls: sum("walls"), openings: sum("openings"), items: sum("items"), materials: p.materials?.length ?? 0 };
}
