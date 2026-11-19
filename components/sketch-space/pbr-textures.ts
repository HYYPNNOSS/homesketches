/**
 * Procedural PBR texture generator for Sketch Space.
 *
 * Every builtin material is described as a per-pixel function over a seamless
 * tile (u, v ∈ [0,1)). It returns colour, a height value (used to derive the
 * normal map) and roughness. All noise is periodic, so tiles repeat without
 * seams, and each tile maps to `tileM` metres in the world (see types.ts), so
 * planks, bricks and tiles keep real-world proportions on any surface.
 *
 * This module has no DOM or three.js dependency — it returns raw RGBA arrays.
 */

export interface PbrMaps {
  size: number;
  albedo: Uint8ClampedArray<ArrayBuffer>;    // RGBA, sRGB
  normal: Uint8ClampedArray<ArrayBuffer>;    // RGBA, OpenGL (+Y) tangent space
  roughness: Uint8ClampedArray<ArrayBuffer>; // RGBA, roughness in G (three.js convention)
}

interface Sample { r: number; g: number; b: number; h: number; rough: number }
type Shader = (u: number, v: number) => Sample;

// ── Periodic noise ───────────────────────────────────────────────────────────
function hash(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 982451653);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
const mod = (a: number, n: number) => ((a % n) + n) % n;
const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Value noise on a lattice that repeats every (px, py) cells. */
function vnoise(x: number, y: number, px: number, py: number, seed: number): number {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = smooth(x - x0), fy = smooth(y - y0);
  const xa = mod(x0, px), xb = mod(x0 + 1, px), ya = mod(y0, py), yb = mod(y0 + 1, py);
  return lerp(lerp(hash(xa, ya, seed), hash(xb, ya, seed), fx), lerp(hash(xa, yb, seed), hash(xb, yb, seed), fx), fy);
}

/** Seamless fBm over the unit tile; fx/fy are integer base frequencies. */
function fbm(u: number, v: number, fx: number, fy: number, octaves: number, seed: number): number {
  let sum = 0, amp = 0.5, norm = 0;
  for (let o = 0; o < octaves; o++) {
    const m = 1 << o;
    sum += amp * vnoise(u * fx * m, v * fy * m, fx * m, fy * m, seed + o * 17);
    norm += amp; amp *= 0.5;
  }
  return sum / norm;
}

const hex = (c: string): [number, number, number] => [parseInt(c.slice(1, 3), 16) / 255, parseInt(c.slice(3, 5), 16) / 255, parseInt(c.slice(5, 7), 16) / 255];
const mix3 = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const S = (c: [number, number, number], h: number, rough: number): Sample => ({ r: c[0], g: c[1], b: c[2], h, rough });
/** Soft step of distance-to-edge for grout / mortar / plank gaps. */
const edge = (d: number, width: number) => clamp01(d / width);

// ── Material shaders ─────────────────────────────────────────────────────────
function wood(light: string, dark: string, planksAcross: number, rowsPerTile: number, seed: number): Shader {
  const cl = hex(light), cd = hex(dark);
  return (u, v) => {
    const row = Math.floor(v * planksAcross), lv = v * planksAcross - row;
    const shift = hash(row, 0, seed) * rowsPerTile;
    const along = u * rowsPerTile + shift;
    const plank = Math.floor(along), lu = along - plank;
    const pid = mod(plank, rowsPerTile);
    const tone = hash(pid, row, seed + 3);
    // Long grain: stretched noise along the plank plus growth rings.
    const g = fbm(u, v, 3, planksAcross * 10, 4, seed + pid * 7 + row * 13);
    const rings = 0.5 + 0.5 * Math.sin((lv * 9 + g * 6 + tone * 20) * Math.PI);
    const knot = fbm(u, v, 8, 8, 2, seed + 99);
    let c = mix3(cl, cd, clamp01(0.25 + tone * 0.45 + (rings - 0.5) * 0.25 + (g - 0.5) * 0.6));
    c = mix3(c, cd, clamp01((knot - 0.72) * 3));
    const gap = Math.min(edge(lv, 0.035), edge(1 - lv, 0.035), edge(lu, 0.012), edge(1 - lu, 0.012));
    c = mix3(cd.map(x => x * 0.45) as [number, number, number], c, gap);
    return S(c, gap * 0.8 + g * 0.2, 0.42 + (1 - gap) * 0.4 + (g - 0.5) * 0.2);
  };
}

function herringbone(light: string, dark: string, seed: number): Shader {
  const cl = hex(light), cd = hex(dark);
  // Planks are 1×L cells. A cell belongs to a horizontal plank when
  // (x − y) mod 2L < L, otherwise to a vertical one — a staircase that tiles
  // the plane exactly. N is a multiple of 2L so the pattern stays seamless.
  const L = 4, N = 16;
  return (u, v) => {
    const x = u * N, y = v * N, cx = Math.floor(x), cy = Math.floor(y);
    const t = mod(cx - cy, 2 * L), horizontal = t < L;
    let along: number, across: number, id: number;
    if (horizontal) { const x0 = cx - t; along = (x - x0) / L; across = y - cy; id = mod(x0, N) * 41 + mod(cy, N); }
    else { const y0 = cy - (2 * L - 1 - t); along = (y - y0) / L; across = x - cx; id = mod(cx, N) * 43 + mod(y0, N) + 977; }
    const tone = hash(id, 5, seed);
    const g = horizontal ? fbm(u, v, 4, N * 6, 3, seed + id) : fbm(u, v, N * 6, 4, 3, seed + id);
    let c = mix3(cl, cd, clamp01(0.2 + tone * 0.5 + (g - 0.5) * 0.7));
    const gap = Math.min(edge(across, 0.05), edge(1 - across, 0.05), edge(along, 0.012), edge(1 - along, 0.012));
    c = mix3(cd.map(x => x * 0.4) as [number, number, number], c, gap);
    return S(c, gap * 0.8 + g * 0.2, 0.4 + (1 - gap) * 0.4 + (g - 0.5) * 0.2);
  };
}

function concrete(base: string, seed: number): Shader {
  const c0 = hex(base);
  return (u, v) => {
    const blot = fbm(u, v, 3, 3, 5, seed);
    const fine = fbm(u, v, 48, 48, 2, seed + 5);
    const pore = hash(Math.floor(u * 700), Math.floor(v * 700), seed + 9) > 0.996 ? 1 : 0;
    const t = (blot - 0.5) * 0.35 + (fine - 0.5) * 0.12 - pore * 0.25;
    const c: [number, number, number] = [c0[0] * (1 + t), c0[1] * (1 + t), c0[2] * (1 + t * 0.9)];
    return S(c, fine * 0.3 + blot * 0.2 - pore * 0.5, 0.32 + (blot - 0.5) * 0.3 + pore * 0.3);
  };
}

function tiles(opts: { cols: number; rows: number; base: string; grout: string; groutW: number; vary: number; seed: number; offsetRows?: boolean; vein?: boolean; cleft?: boolean; gloss: number }): Shader {
  const cb = hex(opts.base), cg = hex(opts.grout);
  return (u, v) => {
    const y = v * opts.rows, row = Math.floor(y), ly = y - row;
    const x = u * opts.cols + (opts.offsetRows && row % 2 ? 0.5 : 0), col = Math.floor(x), lx = x - col;
    const id = mod(col, opts.cols) * 31 + row;
    const tone = (hash(id, 1, opts.seed) - 0.5) * opts.vary;
    let c: [number, number, number] = [cb[0] + tone, cb[1] + tone, cb[2] + tone];
    let h = 1, rough = opts.gloss;
    if (opts.vein) {
      const turb = fbm(u, v, 2, 2, 4, opts.seed + 2), turb2 = fbm(u, v, 3, 3, 5, opts.seed + 8);
      const vein = Math.pow(1 - Math.abs(Math.sin((u + v + turb * 2.2) * Math.PI * 2)), 9);
      const vein2 = Math.pow(1 - Math.abs(Math.sin((u * 2 - v + turb2 * 3) * Math.PI * 2)), 28);
      const cloud = (fbm(u, v, 4, 4, 4, opts.seed + 4) - 0.5) * 0.06;
      c = mix3([c[0] + cloud, c[1] + cloud, c[2] + cloud], [0.55, 0.57, 0.6], clamp01(vein * 0.45 + vein2 * 0.4));
    }
    if (opts.cleft) {
      const cl = fbm(u, v, 12, 12, 4, opts.seed + 6);
      c = c.map(x => x * (0.85 + cl * 0.3)) as [number, number, number];
      h = 0.7 + cl * 0.3; rough = opts.gloss + (cl - 0.5) * 0.2;
    }
    const sx = opts.groutW * opts.cols, sy = opts.groutW * opts.rows;
    const g = Math.min(edge(lx, sx), edge(1 - lx, sx), edge(ly, sy), edge(1 - ly, sy));
    // Slight bevel on tile edges reads as glazed ceramic.
    const bevel = Math.min(edge(lx, sx * 3), edge(1 - lx, sx * 3), edge(ly, sy * 3), edge(1 - ly, sy * 3));
    c = mix3(cg, c, g);
    return S(c, g * (0.6 + 0.4 * bevel) * h, g < 1 ? 0.9 : rough);
  };
}

function terrazzo(seed: number): Shader {
  const base = hex("#e4ddd2");
  const chips: [number, number, number][] = [hex("#8a8f94"), hex("#b9774f"), hex("#f4f1ea"), hex("#3f4447"), hex("#c9a77c")];
  return (u, v) => {
    let c = base, h = 0.5;
    // Cellular chips: test the 3×3 neighbourhood of a periodic jittered grid.
    for (const n of [24, 60]) {
      const x = u * n, y = v * n, cx = Math.floor(x), cy = Math.floor(y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const gx = mod(cx + dx, n), gy = mod(cy + dy, n);
        if (hash(gx, gy, seed + n) > (n === 24 ? 0.55 : 0.4)) continue;
        const px = cx + dx + hash(gx, gy, seed + 1), py = cy + dy + hash(gx, gy, seed + 2);
        const r = (n === 24 ? 0.28 : 0.22) * (0.5 + hash(gx, gy, seed + 3));
        if (Math.hypot(x - px, y - py) < r) { c = chips[Math.floor(hash(gx, gy, seed + 4) * chips.length)]; h = 0.55; }
      }
    }
    const f = (fbm(u, v, 40, 40, 2, seed) - 0.5) * 0.06;
    return S([c[0] + f, c[1] + f, c[2] + f], h, 0.28);
  };
}

function carpet(base: string, seed: number): Shader {
  const cb = hex(base);
  return (u, v) => {
    const fibre = hash(Math.floor(u * 900), Math.floor(v * 900), seed);
    const tuft = fbm(u, v, 40, 40, 3, seed + 1);
    const t = (fibre - 0.5) * 0.14 + (tuft - 0.5) * 0.25;
    return S([cb[0] * (1 + t), cb[1] * (1 + t), cb[2] * (1 + t)], tuft * 0.6 + fibre * 0.4, 0.95);
  };
}

function plaster(base: string, mottle: number, seed: number): Shader {
  const cb = hex(base);
  return (u, v) => {
    const m = fbm(u, v, 3, 3, 5, seed);
    const trowel = fbm(u, v, 10, 6, 3, seed + 3);
    const t = (m - 0.5) * mottle + (trowel - 0.5) * mottle * 0.4;
    return S([cb[0] * (1 + t), cb[1] * (1 + t), cb[2] * (1 + t)], trowel * 0.5 + m * 0.5, 0.88 + (trowel - 0.5) * 0.1);
  };
}

function brick(seed: number): Shader {
  // 0.9 m tile: 4 bricks across (225 mm pitch), 12 courses (75 mm pitch).
  const reds: [number, number, number][] = [hex("#9b4a36"), hex("#a85a3f"), hex("#7f3b2c"), hex("#b0664a"), hex("#8c4632")];
  const mortar = hex("#cfc6b8");
  return (u, v) => {
    const y = v * 12, row = Math.floor(y), ly = y - row;
    const x = u * 4 + (row % 2 ? 0.5 : 0), col = Math.floor(x), lx = x - col;
    const id = mod(col, 4) * 13 + row;
    const base = reds[Math.floor(hash(id, 0, seed) * reds.length)];
    const grit = fbm(u, v, 64, 64, 3, seed + 1);
    const burn = fbm(u, v, 8, 24, 3, seed + id);
    let c = base.map(x => x * (0.8 + grit * 0.3 - (burn > 0.68 ? 0.2 : 0))) as [number, number, number];
    const m = Math.min(edge(lx, 0.045), edge(1 - lx, 0.045), edge(ly, 0.13), edge(1 - ly, 0.13));
    const mg = fbm(u, v, 128, 128, 2, seed + 7);
    c = mix3(mortar.map(x => x * (0.85 + mg * 0.2)) as [number, number, number], c, m);
    return S(c, m * (0.75 + grit * 0.25), 0.8 + (1 - m) * 0.15);
  };
}

function slats(seed: number): Shader {
  const cl = hex("#9a7050"), cd = hex("#5e3f2a");
  // 0.6 m tile: 10 vertical slats of 60 mm with dark shadow gaps.
  return (u, v) => {
    const x = u * 10, s = Math.floor(x), lx = x - s;
    const tone = hash(s, 0, seed);
    const g = fbm(u, v, 40, 2, 4, seed + s);
    let c = mix3(cl, cd, clamp01(0.2 + tone * 0.4 + (g - 0.5) * 0.8));
    const gap = Math.min(edge(lx - 0.1, 0.06), edge(0.98 - lx, 0.04));
    c = mix3([0.08, 0.06, 0.05], c, clamp01(gap));
    return S(c, clamp01(gap), 0.55 + (g - 0.5) * 0.2);
  };
}

const SHADERS: Record<string, { shade: Shader; bump: number }> = {
  "oak-wood": { shade: wood("#d2a872", "#9a6a3c", 6, 2, 11), bump: 2.5 },
  "walnut-wood": { shade: wood("#7d573b", "#3e271a", 6, 2, 23), bump: 2.5 },
  "herringbone-oak": { shade: herringbone("#d0a26a", "#93653a", 31), bump: 2.5 },
  "polished-concrete": { shade: concrete("#9d9fa0", 5), bump: 1.2 },
  "marble-tile": { shade: tiles({ cols: 2, rows: 2, base: "#ecebe7", grout: "#c9c7c0", groutW: 0.002, vary: 0.03, seed: 7, vein: true, gloss: 0.12 }), bump: 1.5 },
  "slate-tile": { shade: tiles({ cols: 2, rows: 2, base: "#40464a", grout: "#2a2d2f", groutW: 0.004, vary: 0.1, seed: 13, cleft: true, gloss: 0.7 }), bump: 4 },
  "ceramic-tile": { shade: tiles({ cols: 2, rows: 2, base: "#efefeb", grout: "#bdbab2", groutW: 0.006, vary: 0.02, seed: 17, gloss: 0.12 }), bump: 3 },
  "terrazzo": { shade: terrazzo(19), bump: 0.6 },
  "cozy-carpet": { shade: carpet("#cfc4b8", 29), bump: 2 },
  "white-plaster": { shade: plaster("#efeeea", 0.05, 37), bump: 0.8 },
  "limewash": { shade: plaster("#e2d6c3", 0.16, 41), bump: 0.8 },
  "sage-paint": { shade: plaster("#8d9e88", 0.04, 43), bump: 0.5 },
  "exposed-brick": { shade: brick(47), bump: 5 },
  "subway-tile": { shade: tiles({ cols: 4, rows: 8, base: "#f2f1ed", grout: "#c4c0b6", groutW: 0.003, vary: 0.025, seed: 53, offsetRows: true, gloss: 0.1 }), bump: 3 },
  "warm-wood-panel": { shade: slats(59), bump: 4 },
};

export const PROCEDURAL_IDS = Object.keys(SHADERS);
export const hasProceduralMaterial = (id: string) => Object.hasOwn(SHADERS, id);

/** Generate seamless albedo / normal / roughness maps at `size`×`size`. */
export function generatePbrMaps(id: string, size = 1024): PbrMaps | null {
  const def = SHADERS[id];
  if (!def) return null;
  const n = size * size;
  const albedo = new Uint8ClampedArray(n * 4), normal = new Uint8ClampedArray(n * 4), roughness = new Uint8ClampedArray(n * 4);
  const height = new Float32Array(n);
  const toSrgb = (c: number) => Math.round(clamp01(c) * 255);
  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x++) {
      const s = def.shade((x + 0.5) / size, v), i = y * size + x, o = i * 4;
      albedo[o] = toSrgb(s.r); albedo[o + 1] = toSrgb(s.g); albedo[o + 2] = toSrgb(s.b); albedo[o + 3] = 255;
      const r = toSrgb(s.rough);
      roughness[o] = r; roughness[o + 1] = r; roughness[o + 2] = r; roughness[o + 3] = 255;
      height[i] = s.h;
    }
  }
  // Normal from the height field (central differences, wrapping at edges).
  // Bump strength is scaled so relief looks the same at any resolution.
  const k = def.bump * (size / 512);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const l = height[y * size + mod(x - 1, size)], r = height[y * size + mod(x + 1, size)];
    const t = height[mod(y - 1, size) * size + x], b = height[mod(y + 1, size) * size + x];
    let nx = (l - r) * k, ny = (b - t) * k, nz = 1;
    const len = Math.hypot(nx, ny, nz); nx /= len; ny /= len; nz /= len;
    const o = (y * size + x) * 4;
    normal[o] = Math.round((nx * 0.5 + 0.5) * 255); normal[o + 1] = Math.round((ny * 0.5 + 0.5) * 255); normal[o + 2] = Math.round((nz * 0.5 + 0.5) * 255); normal[o + 3] = 255;
  }
  return { size, albedo, normal, roughness };
}
