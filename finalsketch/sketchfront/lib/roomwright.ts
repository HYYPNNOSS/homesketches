/**
 * Roomwright API client (lib/roomwright.ts)
 * Wraps the Cloudflare Workers AI endpoint.
 */

const API_URL =
  process.env.NEXT_PUBLIC_ROOMWRIGHT_API_URL ??
  "https://cool-pond-e385.anyahadri17.workers.dev";

const API_KEY = process.env.NEXT_PUBLIC_ROOMWRIGHT_API_KEY ?? "";

function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (API_KEY) h["Authorization"] = `Bearer ${API_KEY}`;
  return h;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ImageInput = {
  data: string; // base64, no data-URL prefix
  mime: "image/png" | "image/jpeg";
};

export type Direction = {
  intent: "render" | "plan" | "walkthrough";
  needsSketch: boolean;
  look?: string;
  style?: string;
  light?: string;
  room?: string;
  notes?: string;
  prompt?: string;
};

export type RenderResult = {
  image: string; // base64
  mime: "image/png" | "image/jpeg";
  model: string;
  fallbackUsed: boolean;
  width: number;
  height: number;
};

export class RoomwrightError extends Error {
  constructor(
    public kind: "quota" | "rate" | "auth" | "generic",
    message: string,
    public retryAfter?: number
  ) {
    super(message);
    this.name = "RoomwrightError";
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function checkResponse(res: Response): Promise<void> {
  if (res.ok) return;
  let body: { kind?: string; error?: string; message?: string; retryAfter?: number } = {};
  try { body = await res.json(); } catch { /* ignore */ }

  if (res.status === 401 || res.status === 403)
    throw new RoomwrightError("auth", body.error ?? body.message ?? "Authentication failed.");
  if (res.status === 429 || body.kind === "rate")
    throw new RoomwrightError("rate", body.error ?? body.message ?? "Rate limited. Wait a moment.", body.retryAfter);
  if (body.kind === "quota")
    throw new RoomwrightError("quota", "Free daily limit reached — resets at 00:00 UTC.", body.retryAfter);
  throw new RoomwrightError("generic", body.error ?? body.message ?? `Server error (${res.status})`);
}

export function toDataUrl(result: RenderResult): string {
  return `data:${result.mime};base64,${result.image}`;
}

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/direction — turns a free-text request into structured render params.
 * Costs no Neurons.
 */
export async function getDirection(text: string): Promise<Direction> {
  const res = await fetch(`${API_URL}/api/v1/direction`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ text }),
  });
  await checkResponse(res);
  return res.json() as Promise<Direction>;
}

/**
 * POST /api/v1/render — renders an image from direction + optional images.
 */
export async function renderDirection(
  direction: Direction,
  opts: {
    images?: ImageInput[];
    aspect?: "square" | "landscape" | "portrait";
    plan?: object;
  } = {}
): Promise<RenderResult> {
  const body: Record<string, unknown> = {
    model: "klein",
    autoFallback: true,
    look: direction.look,
    style: direction.style,
    light: direction.light,
    room: direction.room,
    notes: direction.notes,
    prompt: direction.prompt,
    aspect: opts.aspect ?? "landscape",
  };
  if (opts.images?.length) {
    body.images = opts.images;
    body.mode = "sketch";
  }
  if (opts.plan) body.plan = opts.plan;

  const res = await fetch(`${API_URL}/api/v1/render`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  await checkResponse(res);
  return res.json() as Promise<RenderResult>;
}
