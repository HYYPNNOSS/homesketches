import { NextRequest, NextResponse } from "next/server";
import { askJson, type LlmImage } from "../../../../lib/free-ai";
import { buildAiPrompt, buildProjectFromAiJson } from "../../../../components/sketch-space/ai-json";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BRIEF = 2000;
const MAX_IMAGE_CHARS = 1_500_000; // base64; fileToImageInput keeps images ~1.2M
const MAX_CURRENT_CHARS = 200_000;

// Basic per-IP limit (per server instance) to protect the free quotas.
const WINDOW_MS = 60_000, PER_WINDOW = 6;
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter(t => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > PER_WINDOW;
}

const fail = (message: string, status: number, kind = "generic") => NextResponse.json({ kind, message }, { status });

const SYSTEM = "You are a precise residential architect. Reply with a single JSON object that follows the user's schema exactly. No prose, no markdown. Use built-in material ids directly; only list custom materials in \"materials\".";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip)) return fail("Too many plan requests. Wait a minute and try again.", 429, "rate");

  let body: { brief?: unknown; image?: unknown; current?: unknown };
  try { body = await req.json(); } catch { return fail("Invalid request.", 400); }

  const brief = typeof body.brief === "string" ? body.brief.trim().slice(0, MAX_BRIEF) : "";
  let image: LlmImage | undefined;
  if (body.image && typeof body.image === "object") {
    const { data, mime } = body.image as Record<string, unknown>;
    if (typeof data !== "string" || !["image/png", "image/jpeg", "image/webp"].includes(mime as string)) return fail("Attach a PNG, JPG or WebP image.", 400);
    if (data.length > MAX_IMAGE_CHARS) return fail("That image is too large.", 413);
    image = { data, mime: mime as string };
  }
  const current = typeof body.current === "string" && body.current.length <= MAX_CURRENT_CHARS ? body.current : undefined;
  if (!brief && !image) return fail("Describe the space or attach a sketch.", 400);

  const task = image
    ? `Trace the attached floor-plan sketch or photo as accurately as you can: read room names, proportions and any written dimensions; place doors and windows where they are drawn. ${brief ? `Extra instructions: ${brief}` : "If no dimensions are written, assume realistic residential sizes."}`
    : current
      ? `Modify this existing design as requested and return the whole updated project. Request: ${brief}\n\nCURRENT DESIGN:\n${current}`
      : brief;

  let user = buildAiPrompt(task);
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    let answer;
    try { answer = await askJson({ system: SYSTEM, user, image }); }
    catch (e) { return fail(e instanceof Error ? e.message : "AI unavailable.", 503, "quota"); }
    try {
      const result = buildProjectFromAiJson(answer.text);
      return NextResponse.json({ ...result, provider: answer.provider }, { headers: { "Cache-Control": "no-store" } });
    } catch (e) {
      lastError = e instanceof Error ? e.message : "Invalid plan.";
      // One repair round: show the model its output and the parser error.
      user = `${buildAiPrompt(task)}\n\nYour previous answer could not be used: ${lastError}\nPrevious answer:\n${answer.text.slice(0, 20000)}\n\nReturn a corrected JSON object.`;
    }
  }
  return fail(`The AI returned a plan that couldn't be built: ${lastError}`, 502);
}
