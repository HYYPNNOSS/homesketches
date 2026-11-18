import { NextRequest, NextResponse } from "next/server";

const allowedHosts = new Set(["rest.fal.ai", "queue.fal.run", "fal.run"]);
function failure(message: string, status: number) {
  return NextResponse.json({ error: message, message, detail: message }, { status });
}
async function proxy(req: NextRequest): Promise<NextResponse> {
  const target = req.headers.get("x-fal-target-url");
  const key = process.env.FAL_KEY;
  if (!target && req.method === "GET") return NextResponse.json({ configured: Boolean(key) }, { headers: { "Cache-Control": "no-store" } });
  if (!target) return failure("Missing fal destination.", 400);
  let url: URL;
  try { url = new URL(target); } catch { return failure("Invalid fal destination.", 400); }
  if (url.protocol !== "https:" || !allowedHosts.has(url.hostname) || url.port || url.username || url.password) return failure("This fal destination is not allowed.", 400);
  if (!key) return failure("AI generation is not configured. Add FAL_KEY to sketchfront/.env.local and restart the app.", 503);
  const headers = new Headers({ Authorization: `Key ${key}` });
  req.headers.forEach((value, name) => {
    if (["content-type", "accept"].includes(name) || (name.startsWith("x-fal-") && name !== "x-fal-target-url")) headers.set(name, value);
  });
  try {
    const response = await fetch(url, {
      method: req.method, headers, redirect: "error", cache: "no-store",
      body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer(),
      signal: AbortSignal.timeout(120000),
    });
    return new NextResponse(response.body, { status: response.status, headers: { "Content-Type": response.headers.get("content-type") ?? "application/json", "Cache-Control": "no-store" } });
  } catch {
    return failure("The generation service could not be reached. Please try again.", 502);
  }
}
export { proxy as GET, proxy as POST, proxy as PUT, proxy as DELETE };
