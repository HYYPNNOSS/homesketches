/**
 * Shared PBR materials for Sketch Space surfaces (floors, walls, furniture).
 *
 * Geometry built by the engine carries UVs in metres (see `applyWorldUVs`),
 * so a texture's `repeat` is simply 1 / tileM and every surface shares one
 * material per finish — patterns line up across wall segments and rooms.
 */
import * as THREE from "three";
import { generatePbrMaps, hasProceduralMaterial } from "./pbr-textures";
import { builtinMaterial, type CustomMaterial } from "./types";

const PROCEDURAL_RES = 512;

function canvasTexture(size: number, pixels: Uint8ClampedArray, srgb: boolean): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  canvas.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(pixels), size, size), 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return tex;
}

const thumbCache = new Map<string, string>();
/** Small seamless preview (data URL) of a builtin procedural material. */
export function materialThumbnail(id: string, size = 96): string {
  if (typeof document === "undefined") return "";
  const key = `${id}@${size}`;
  const hit = thumbCache.get(key);
  if (hit !== undefined) return hit;
  const maps = generatePbrMaps(id, size);
  if (!maps) return "";
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  canvas.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(maps.albedo), size, size), 0, 0);
  const url = canvas.toDataURL("image/png");
  thumbCache.set(key, url);
  return url;
}

/**
 * Rewrites a BoxGeometry's UVs so 1 UV unit = 1 metre on every face.
 * For wall pieces, `along`/`base` give the piece's start distance along the
 * wall and its bottom height, so split segments, sills and headers continue
 * one pattern. `floor` aligns the ±Y faces to world X/Z (pass [x, -z - d]
 * for a box whose min corner is at x, z).
 */
export function applyWorldUVs(geo: THREE.BoxGeometry, sx: number, sy: number, sz: number, along = 0, base = 0, floor: [number, number] = [0, 0]): THREE.BoxGeometry {
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z — 4 vertices each.
  // The -z face runs its U backwards, so mirror its offset to stay continuous.
  const faces: Array<[number, number, number, number]> = [
    [sz, sy, 0, base], [sz, sy, 0, base],
    [sx, sz, floor[0], floor[1]], [sx, sz, floor[0], floor[1]],
    [sx, sy, along, base], [sx, sy, -(along + sx), base],
  ];
  for (let f = 0; f < 6; f++) {
    const [su, sv, ou, ov] = faces[f];
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, uv.getX(i) * su + ou, uv.getY(i) * sv + ov);
    }
  }
  uv.needsUpdate = true;
  return geo;
}

export class MaterialLibrary {
  private materials = new Map<string, THREE.MeshStandardMaterial>();
  private customSignature = new Map<string, string>();
  private custom = new Map<string, CustomMaterial>();
  private queue: string[] = [];
  private queueTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  constructor(private anisotropy: number, private onUpdate: () => void) {}

  /** Sync the project's imported materials (re-creates only changed ones). */
  setCustomMaterials(list: CustomMaterial[] = []) {
    const seen = new Set<string>();
    for (const m of list) {
      seen.add(m.id);
      const sig = JSON.stringify([m.albedo?.length, m.albedo?.slice(-64), m.normal?.length, m.roughnessMap?.length, m.color, m.tileM, m.roughness, m.metalness]);
      if (this.customSignature.get(m.id) === sig) continue;
      this.customSignature.set(m.id, sig);
      this.custom.set(m.id, m);
      this.drop(m.id);
    }
    for (const id of [...this.custom.keys()]) if (!seen.has(id)) { this.custom.delete(id); this.customSignature.delete(id); this.drop(id); }
  }

  /** Real-world size (m) of one repeat of the material's texture. */
  tileM(id: string): number {
    return this.custom.get(id)?.tileM ?? builtinMaterial(id)?.tileM ?? 1;
  }

  has(id: string): boolean {
    return this.custom.has(id) || hasProceduralMaterial(id) || id.startsWith("data:image/");
  }

  owns(material: THREE.Material): boolean {
    for (const m of this.materials.values()) if (m === material) return true;
    return false;
  }

  /** Shared material for a finish id, or null when the id is unknown. */
  get(id: string | undefined): THREE.MeshStandardMaterial | null {
    if (!id || !this.has(id)) return null;
    const existing = this.materials.get(id);
    if (existing) return existing;
    const mat = this.create(id);
    this.materials.set(id, mat);
    return mat;
  }

  dispose() {
    this.disposed = true;
    if (this.queueTimer) clearTimeout(this.queueTimer);
    for (const id of [...this.materials.keys()]) this.drop(id);
  }

  private drop(id: string) {
    const m = this.materials.get(id);
    if (!m) return;
    for (const t of [m.map, m.normalMap, m.roughnessMap]) t?.dispose();
    m.dispose();
    this.materials.delete(id);
  }

  private prepare(tex: THREE.Texture, tileM: number) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1 / tileM, 1 / tileM);
    tex.anisotropy = this.anisotropy;
    tex.needsUpdate = true;
    return tex;
  }

  private create(id: string): THREE.MeshStandardMaterial {
    const custom = this.custom.get(id) ?? (id.startsWith("data:image/") ? { id, name: "Imported", category: "any", albedo: id, tileM: 1, roughness: 0.6, metalness: 0 } as CustomMaterial : undefined);
    if (custom) {
      const mat = new THREE.MeshStandardMaterial({ color: custom.color ?? "#ffffff", roughness: custom.roughness, metalness: custom.metalness });
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin("anonymous");
      const load = (url: string | undefined, srgb: boolean, assign: (t: THREE.Texture) => void) => {
        if (!url) return;
        loader.load(url, tex => {
          if (this.disposed || this.materials.get(id) !== mat) { tex.dispose(); return; }
          tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
          assign(this.prepare(tex, custom.tileM));
          mat.needsUpdate = true;
          this.onUpdate();
        }, undefined, () => { /* keep the flat colour if the image cannot load (e.g. CORS) */ });
      };
      load(custom.albedo, true, t => { mat.map = t; });
      load(custom.normal, false, t => { mat.normalMap = t; mat.normalScale.set(1, 1); });
      load(custom.roughnessMap, false, t => { mat.roughnessMap = t; });
      return mat;
    }
    const preset = builtinMaterial(id)!;
    // Flat preview colour until the maps are generated off the critical path.
    const mat = new THREE.MeshStandardMaterial({ color: preset?.previewColor ?? "#cccccc", roughness: preset?.roughness ?? 0.6, metalness: preset?.metalness ?? 0 });
    this.queue.push(id);
    this.pump();
    return mat;
  }

  private pump() {
    if (this.queueTimer || !this.queue.length || this.disposed) return;
    this.queueTimer = setTimeout(() => {
      this.queueTimer = null;
      const id = this.queue.shift()!;
      const mat = this.materials.get(id);
      const maps = mat && !mat.map ? generatePbrMaps(id, PROCEDURAL_RES) : null;
      if (mat && maps) {
        const tileM = this.tileM(id);
        mat.map = this.prepare(canvasTexture(maps.size, maps.albedo, true), tileM);
        mat.normalMap = this.prepare(canvasTexture(maps.size, maps.normal, false), tileM);
        mat.roughnessMap = this.prepare(canvasTexture(maps.size, maps.roughness, false), tileM);
        mat.color.set(0xffffff);
        mat.roughness = 1; // the roughness map carries the real values
        mat.normalScale.set(1, 1);
        mat.needsUpdate = true;
        this.onUpdate();
      }
      this.pump();
    }, 16);
  }
}
