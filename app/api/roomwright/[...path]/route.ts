import { NextRequest, NextResponse } from "next/server";

// Server-side proxy to the Roomwright worker: the API key never reaches the browser.
export const runtime = "nodejs";
export const maxDuration = 120;

const ALLOWED = new Set(["api/v1/health", "api/v1/prompt", "api/v1/direction", "api/v1/render"]);
const MAX_BODY = 8_000_000;

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join("/");
  if (!ALLOWED.has(path)) return NextResponse.json({ error: "Not found", kind: "generic" }, { status: 404 });
  const base = process.env.ROOMWRIGHT_API_URL;
  if (!base) return NextResponse.json({ error: "Rendering is not configured. Set ROOMWRIGHT_API_URL.", kind: "generic" }, { status: 503 });

  const headers = new Headers({ "Content-Type": "application/json" });
  if (process.env.ROOMWRIGHT_API_KEY) headers.set("Authorization", `Bearer ${process.env.ROOMWRIGHT_API_KEY}`);
  // Daily limits are per visitor: pass the visitor's IP as the client id.
  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip");
  if (ip) headers.set("x-client-id", ip);

  let body: ArrayBuffer | undefined;
  if (req.method === "POST") {
    body = await req.arrayBuffer();
    if (body.byteLength > MAX_BODY) return NextResponse.json({ error: "Request too large.", kind: "generic" }, { status: 413 });
  }
  const search = req.nextUrl.searchParams.get("format") === "binary" ? "?format=binary" : "";
  try {
    const res = await fetch(`${base.replace(/\/+$/, "")}/${path}${search}`, {
      method: req.method, headers, body, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(115_000),
    });
    const out = new Headers({ "Content-Type": res.headers.get("content-type") ?? "application/json", "Cache-Control": "no-store" });
    const retry = res.headers.get("retry-after");
    if (retry) out.set("Retry-After", retry);
    return new NextResponse(res.body, { status: res.status, headers: out });
  } catch (e) {
    const timeout = e instanceof Error && e.name === "TimeoutError";
    return NextResponse.json({ error: timeout ? "Rendering timed out. Please retry." : "The render service could not be reached.", kind: "generic" }, { status: timeout ? 504 : 502 });
  }
}

export { proxy as GET, proxy as POST };
