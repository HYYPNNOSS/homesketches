/**
 * Server-only access to free LLM tiers: Groq and Google Gemini.
 * Keys come from GROQ_API_KEY / GEMINI_API_KEY (never NEXT_PUBLIC_*).
 * Each call tries providers in order and returns the first JSON answer.
 * Import only from server code (route handlers).
 */

export type LlmImage = { data: string; mime: string };
export type LlmRequest = { system: string; user: string; image?: LlmImage };
export type LlmResult = { text: string; provider: string };

const TIMEOUT = 60_000;

// Google's Interactions API. New AI Studio keys can't use generateContent on most models.
async function gemini(model: string, req: LlmRequest): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  const input: Record<string, unknown>[] = [{ type: "text", text: req.user }];
  if (req.image) input.push({ type: "image", data: req.image.data, mime_type: req.image.mime });
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      model,
      system_instruction: req.system,
      input,
      response_format: { type: "text", mime_type: "application/json" },
    }),
    signal: AbortSignal.timeout(TIMEOUT),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Gemini ${model} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = await res.json() as { steps?: { type?: string; content?: { type?: string; text?: string }[] }[] };
  const text = (body.steps ?? []).filter(st => st.type === "model_output").flatMap(st => st.content ?? []).map(c => c.text ?? "").join("");
  if (!text.trim()) throw new Error(`Gemini ${model} returned no text`);
  return text;
}

async function groq(model: string, req: LlmRequest): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set");
  if (req.image) throw new Error("Groq route is text-only here");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: req.system }, { role: "user", content: req.user }],
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_completion_tokens: 8192,
    }),
    signal: AbortSignal.timeout(TIMEOUT),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Groq ${model} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = await res.json() as { choices?: { message?: { content?: string } }[] };
  const text = body.choices?.[0]?.message?.content ?? "";
  if (!text.trim()) throw new Error(`Groq ${model} returned no text`);
  return text;
}

type Step = { name: string; run: (r: LlmRequest) => Promise<string> };

// Text: Groq is fastest; Gemini as backup. Images: Gemini only (vision).
const TEXT_CHAIN: Step[] = [
  { name: "groq:gpt-oss-120b", run: r => groq("openai/gpt-oss-120b", r) },
  { name: "gemini:3.5-flash", run: r => gemini("gemini-3.5-flash", r) },
  { name: "groq:gpt-oss-20b", run: r => groq("openai/gpt-oss-20b", r) },
  { name: "gemini:flash-lite", run: r => gemini("gemini-flash-lite-latest", r) },
];
const IMAGE_CHAIN: Step[] = [
  { name: "gemini:3.8-flash", run: r => gemini("gemini-3.8-flash", r) },
  { name: "gemini:3.5-flash", run: r => gemini("gemini-3.5-flash", r) },
  { name: "gemini:3.1-flash-lite", run: r => gemini("gemini-3.1-flash-lite", r) },
  { name: "gemini:flash-lite", run: r => gemini("gemini-flash-lite-latest", r) },
];

export async function askJson(req: LlmRequest): Promise<LlmResult> {
  const errors: string[] = [];
  for (const step of req.image ? IMAGE_CHAIN : TEXT_CHAIN) {
    try {
      return { text: await step.run(req), provider: step.name };
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
      console.warn(`[free-ai] ${step.name} failed, trying next:`, errors.at(-1));
    }
  }
  console.error("[free-ai] all providers failed:", errors);
  throw new Error("All free AI providers are busy or over their limit. Try again in a minute.");
}
