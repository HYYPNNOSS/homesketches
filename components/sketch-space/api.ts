/**
 * Roomwright API client.
 * Calls go through the same-origin /api/roomwright proxy; the key stays on the server.
 */
import type { RenderRequest, RenderResponse, RenderError } from "./types";

// Same-origin proxy (app/api/roomwright) adds the API key on the server.
const API_URL = "/api/roomwright";


function headers(): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
  };
  return h;
}

/**
 * Parses an error response into a structured RenderError.
 */
async function parseError(res: Response): Promise<RenderError> {
  try {
    const body = (await res.json()) as {
      kind?: string;
      message?: string;
      retryAfter?: number;
      error?: string;
    };
    if (res.status === 401 || res.status === 403) {
      return { kind: "auth", message: body.message ?? "Authentication failed. Check your API key." };
    }
    if (res.status === 429 || body.kind === "rate") {
      return {
        kind: "rate",
        message: body.message ?? "Rate limited. Please wait a moment.",
        retryAfter: body.retryAfter,
      };
    }
    if (body.kind === "quota") {
      return {
        kind: "quota",
        message: "Free daily limit reached, resets at 00:00 UTC",
        retryAfter: body.retryAfter,
      };
    }
    return {
      kind: "generic",
      message: body.message ?? body.error ?? `Server error (${res.status})`,
    };
  } catch {
    return { kind: "generic", message: `Server error (${res.status})` };
  }
}

export async function previewPrompt(params: {
  plan: string;
  look: RenderRequest["look"];
  notes?: string;
  style?: string;
  room?: string;
}): Promise<{ prompt: string } | RenderError> {
  try {
    const res = await fetch(`${API_URL}/api/v1/prompt`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        plan: params.plan,
        look: params.look,
        notes: params.notes,
        style: params.style,
        room: params.room,
        model: "klein",
      }),
    });
    if (!res.ok) return parseError(res);
    return (await res.json()) as { prompt: string };
  } catch (e) {
    return { kind: "generic", message: e instanceof Error ? e.message : "Network error" };
  }
}

export async function render(
  req: RenderRequest,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal
): Promise<RenderResponse | RenderError> {
  let interval: ReturnType<typeof setInterval> | undefined;
  try {
    let pct = 0;
    if (onProgress) interval = setInterval(() => { pct = Math.min(pct + Math.random()*7, 90); onProgress(pct); }, 700);
    const response = await fetch(`${API_URL}/api/v1/render`, {
      method: "POST", headers: headers(), body: JSON.stringify({ ...req, model: req.model ?? "klein" }),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(120000)]) : AbortSignal.timeout(120000),
    });
    if (!response.ok) return parseError(response);
    const result = await response.json() as RenderResponse;
    if (!result.image || !["image/png", "image/jpeg"].includes(result.mime)) throw new Error("The service returned an invalid image.");
    onProgress?.(100);
    return result;
  } catch (e) {
    return { kind: "generic", message: signal?.aborted ? "Render cancelled." : e instanceof Error && e.name === "TimeoutError" ? "Rendering timed out. Please retry." : e instanceof Error ? e.message : "Could not reach the render service." };
  } finally { if (interval) clearInterval(interval); }
}

export function isRenderError(r: RenderResponse | RenderError): r is RenderError {
  return "kind" in r && typeof (r as RenderError).kind === "string" &&
    ["quota", "rate", "auth", "generic"].includes((r as RenderError).kind);
}

/**
 * Converts a data URL (from canvas.toDataURL) into { data, mime } for the API.
 */
export function dataUrlToApiImage(dataUrl: string): { data: string; mime: string } {
  const [header, data] = dataUrl.split(",");
  const mime = header.replace("data:", "").replace(";base64", "");
  return { data, mime };
}

// ─── Recent projects in localStorage ─────────────────────────────────────────

export interface RecentProject {
  id: string;
  title: string;
  look: RenderRequest["look"];
  image: string; // base64
  mime: string;
  timestamp: number;
  sceneSummary: string;
}

const PROJECTS_KEY = "sketch-space-recent";
const MAX_PROJECTS = 20;

export function saveRecentProject(proj: Omit<RecentProject, "id" | "timestamp">) {
  try {
    const existing = getRecentProjects();
    const next: RecentProject = { ...proj, id: Math.random().toString(36).slice(2), timestamp: Date.now() };
    const updated = [next, ...existing].slice(0, MAX_PROJECTS);
    // Store compressed — drop image data of older entries if near quota
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated));
  } catch {
    // Quota — store without images
    try {
      const existing = getRecentProjects().map(p => ({ ...p, image: "" }));
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(existing));
    } catch {/* give up */}
  }
}

export function getRecentProjects(): RecentProject[] {
  try {
    return JSON.parse(localStorage.getItem(PROJECTS_KEY) ?? "[]");
  } catch {
    return [];
  }
}
