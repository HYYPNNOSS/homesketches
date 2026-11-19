import { FURNITURE_SIZES, emptyProject, itemSize, type CustomMaterial, type Project, type Scene, type Vec2 } from "./types";
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= 10000;
const positive = (v: unknown): v is number => finite(v) && v > 0 && v <= 1000;
const vector = (v: unknown): v is Vec2 => Array.isArray(v) && v.length === 2 && v.every(finite);
const colour = (v: unknown) => v === undefined || (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 0xffffff);
const imageUrl = (v: unknown) => v === undefined || (typeof v === "string" && v.length <= 8_000_000 && (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v) || /^https:\/\/[^\s"'<>]+$/.test(v)));

/** Imported / AI-declared PBR materials stored at project level. */
export function validateMaterials(value: unknown): value is CustomMaterial[] {
  return Array.isArray(value) && value.length <= 100 && value.every(m => record(m) && typeof m.id === "string" && m.id.length > 0 && m.id.length <= 80 && typeof m.name === "string"
    && ["floor", "wall", "any"].includes(m.category as string) && imageUrl(m.albedo) && imageUrl(m.normal) && imageUrl(m.roughnessMap)
    && (m.color === undefined || (typeof m.color === "string" && /^#[0-9a-f]{6}$/i.test(m.color)))
    && positive(m.tileM) && finite(m.roughness) && (m.roughness as number) >= 0 && (m.roughness as number) <= 1 && finite(m.metalness) && (m.metalness as number) >= 0 && (m.metalness as number) <= 1)
    && new Set(value.map(m => (m as CustomMaterial).id)).size === value.length;
}
const optional = (o: Record<string, unknown>, fields: string[], check: (v: unknown) => boolean = finite) => fields.every(k => o[k] === undefined || check(o[k]));

export function validateScene(value: unknown): value is Scene {
  if (!record(value) || value.unit !== "m") return false;
  if (value.canvas !== undefined && (!record(value.canvas) || !positive(value.canvas.widthM) || !positive(value.canvas.depthM) || !positive(value.canvas.gridStep))) return false;
  if (value.reference !== undefined) {
    const r=value.reference;
    if(!record(r) || typeof r.name!=="string" || typeof r.dataUrl!=="string" || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(r.dataUrl) || r.dataUrl.length>4_000_000 || !vector(r.center) || !positive(r.widthM) || !positive(r.depthM) || !finite(r.opacity) || r.opacity<0 || r.opacity>1 || typeof r.visible!=="boolean" || (r.calibrated!==undefined && typeof r.calibrated!=="boolean"))return false;
  }
  for (const key of ["walls", "rooms", "openings", "items"]) if (!Array.isArray(value[key]) || value[key].length > 5000) return false;
  const arrays = [value.walls, value.rooms, value.openings, value.items, value.virtualCameras ?? []] as unknown[][];
  if (!arrays.every(a => Array.isArray(a) && a.every(x => record(x) && typeof x.id === "string" && x.id.length > 0))) return false;
  const all = arrays.flat() as Record<string, unknown>[];
  if (new Set(all.map(x => x.id)).size !== all.length) return false;
  const walls = value.walls as Record<string, unknown>[];
  if (!walls.every(w => vector(w.a) && vector(w.b) && optional(w, ["height", "thickness"], positive) && colour(w.color) && (w.materialId === undefined || typeof w.materialId === "string"))) return false;
  if (!(value.rooms as Record<string, unknown>[]).every(r => typeof r.name === "string" && finite(r.x) && finite(r.z) && positive(r.w) && positive(r.d) && ["materialId", "wallMaterialId"].every(k => r[k] === undefined || typeof r[k] === "string"))) return false;
  if (!(value.openings as Record<string, unknown>[]).every(o => ["door", "window"].includes(o.type as string) && vector(o.at) && positive(o.w) && optional(o, ["h"], positive) && optional(o, ["sillHeight"]) && (o.wallId === undefined || walls.some(w => w.id === o.wallId)))) return false;
  if (!(value.items as Record<string, unknown>[]).every(i => typeof i.kind === "string" && Object.hasOwn(FURNITURE_SIZES, i.kind) && finite(i.x) && finite(i.z) && finite(i.rot) && optional(i, ["scale", "w", "d", "h"], positive) && colour(i.color) && ["label", "name"].every(k => i[k] === undefined || typeof i[k] === "string"))) return false;
  return ((value.virtualCameras ?? []) as Record<string, unknown>[]).every(c => typeof c.name === "string" && vector(c.position) && vector(c.targetPosition) && finite(c.heightM) && positive(c.fov) && c.fov <= 120);
}

export function sceneBounds(scene: Scene): { minX: number; maxX: number; minZ: number; maxZ: number } | null {
  const pts: Vec2[] = scene.walls.flatMap(w => [w.a, w.b]);
  for (const r of scene.rooms) pts.push([r.x, r.z], [r.x + r.w, r.z + r.d]);
  for (const i of scene.items) {
    const [w, d] = itemSize(i), scale = i.scale ?? 1;
    const halfX = (Math.abs(Math.cos(i.rot)) * w + Math.abs(Math.sin(i.rot)) * d) * scale / 2;
    const halfZ = (Math.abs(Math.sin(i.rot)) * w + Math.abs(Math.cos(i.rot)) * d) * scale / 2;
    pts.push([i.x - halfX, i.z - halfZ], [i.x + halfX, i.z + halfZ]);
  }
  for (const o of scene.openings) pts.push(o.at);
  if(scene.reference){const r=scene.reference;pts.push([r.center[0]-r.widthM/2,r.center[1]-r.depthM/2],[r.center[0]+r.widthM/2,r.center[1]+r.depthM/2]);}
  if (!pts.length) return null;
  return { minX: Math.min(...pts.map(p => p[0])), maxX: Math.max(...pts.map(p => p[0])), minZ: Math.min(...pts.map(p => p[1])), maxZ: Math.max(...pts.map(p => p[1])) };
}

/** Center legacy positive-coordinate plans without changing dimensions or floor alignment. */
export function normalizeProject(input: Project): Project {
  const project: Project = structuredClone(input);
  const bounds = project.floors.map(f => sceneBounds(f.scene)).filter(b => b !== null);
  if (!bounds.length) return project;
  const minX = Math.min(...bounds.map(b => b.minX)), maxX = Math.max(...bounds.map(b => b.maxX));
  const minZ = Math.min(...bounds.map(b => b.minZ)), maxZ = Math.max(...bounds.map(b => b.maxZ));
  const width = Math.max(maxX - minX, ...project.floors.map(f => f.scene.canvas?.widthM ?? 16));
  const depth = Math.max(maxZ - minZ, ...project.floors.map(f => f.scene.canvas?.depthM ?? 12));
  const outside = project.floors.some(f => {
    const c = f.scene.canvas ?? {widthM:16,depthM:12};
    return minX < -c.widthM / 2 || maxX > c.widthM / 2 || minZ < -c.depthM / 2 || maxZ > c.depthM / 2;
  });
  const dx = outside ? -(minX + maxX) / 2 : 0, dz = outside ? -(minZ + maxZ) / 2 : 0;
  const shift = (p: Vec2): Vec2 => [p[0] + dx, p[1] + dz];
  for (const {scene:s} of project.floors) {
    s.canvas = { widthM: width, depthM: depth, gridStep: s.canvas?.gridStep ?? .1 };
    s.walls.forEach(w => { w.a = shift(w.a); w.b = shift(w.b); });
    s.rooms.forEach(r => { r.x += dx; r.z += dz; });
    s.items.forEach(i => { i.x += dx; i.z += dz; });
    s.openings.forEach(o => { o.at = shift(o.at); });
    if(s.reference)s.reference.center=shift(s.reference.center);
    s.virtualCameras?.forEach(c => { c.position = shift(c.position); c.targetPosition = shift(c.targetPosition); });
  }
  return project;
}

export function parseProject(value: unknown): Project {
  if (validateScene(value)) { const project = emptyProject(); project.floors[0].scene = value; return normalizeProject(project); }
  if (!record(value) || value.unit !== "m" || !Array.isArray(value.floors) || !value.floors.length || value.floors.length > 50 || typeof value.activeFloorId !== "string" || (value.name !== undefined && typeof value.name !== "string") || (value.id !== undefined && typeof value.id !== "string")) throw new Error("Choose a valid Sketch Space project or scene JSON file.");
  if (!value.floors.every(f => record(f) && typeof f.id === "string" && typeof f.name === "string" && finite(f.elevationM) && validateScene(f.scene)) || new Set(value.floors.map(f => f.id)).size !== value.floors.length || !value.floors.some(f => f.id === value.activeFloorId)) throw new Error("The project contains invalid floors, geometry, or object references.");
  if (value.materials !== undefined && !validateMaterials(value.materials)) throw new Error("The project contains invalid materials.");
  return normalizeProject(value as unknown as Project);
}

export function moveJunction(scene: Scene, wallId: string, endpoint: "a" | "b", position: Vec2): Scene {
  const wall = scene.walls.find(w => w.id === wallId);
  if (!wall) return scene;
  const origin = wall[endpoint];
  const same = (p: Vec2) => Math.hypot(p[0]-origin[0], p[1]-origin[1]) < .001;
  const walls = scene.walls.map(w => ({ ...w, a: same(w.a) ? [...position] as Vec2 : w.a, b: same(w.b) ? [...position] as Vec2 : w.b }));
  const openings = scene.openings.map(o => {
    const before = scene.walls.find(w => w.id === o.wallId), after = walls.find(w => w.id === o.wallId);
    if (!before || !after) return o;
    const dx = before.b[0]-before.a[0], dz = before.b[1]-before.a[1];
    let t = ((o.at[0]-before.a[0])*dx+(o.at[1]-before.a[1])*dz) / (dx*dx+dz*dz || 1);
    const length = Math.hypot(after.b[0]-after.a[0], after.b[1]-after.a[1]);
    const width = Math.min(o.w, Math.max(.05, length));
    const margin = Math.min(.5, width / (2 * (length || 1)));
    t = Math.max(margin, Math.min(1-margin, t));
    return { ...o, w: width, at: [after.a[0]+t*(after.b[0]-after.a[0]),after.a[1]+t*(after.b[1]-after.a[1])] as Vec2 };
  });
  return { ...scene, walls, openings };
}
