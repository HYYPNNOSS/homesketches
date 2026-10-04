/**
 * Next.js App Router proxy for fal.ai.
 * The FAL_KEY env var is read server-side only — never sent to the browser.
 *
 * The fal client (1.x) uses the header "x-fal-target-url" to tell the proxy
 * which fal endpoint to forward to. This route forwards that request with
 * the secret key injected server-side.
 */
import { NextRequest, NextResponse } from "next/server";

const FAL_KEY = process.env.FAL_KEY ?? "";
const FAL_BASE = "https://fal.run";
const QUEUE_BASE = "https://queue.fal.run";
const STORAGE_BASE = "https://storage.fal.ai";

function falHeaders() {
  return {
    Authorization: `Key ${FAL_KEY}`,
    "Content-Type": "application/json",
  };
}

async function proxy(req: NextRequest): Promise<NextResponse> {
  // The fal client sets x-fal-target-url to the full fal URL it wants to hit.
  const targetUrl =
    req.headers.get("x-fal-target-url") ??
    req.headers.get("X-Fal-Target-Url");

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing x-fal-target-url header" }, { status: 400 });
  }

  // Build forwarded headers — drop the host and fal-target headers, add auth.
  const forwardHeaders: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === "x-fal-target-url" || lower === "host") return;
    forwardHeaders[key] = value;
  });
  
  const isFalApi = targetUrl.startsWith("https://rest.fal.ai") || 
                   targetUrl.startsWith("https://queue.fal.run") || 
                   targetUrl.startsWith("https://fal.run");
                   
  if (isFalApi) {
    forwardHeaders["Authorization"] = `Key ${FAL_KEY}`;
  }

  const body = req.method !== "GET" && req.method !== "HEAD"
    ? await req.arrayBuffer()
    : undefined;

  const falRes = await fetch(targetUrl, {
    method: req.method,
    headers: forwardHeaders,
    body,
  });

  const responseHeaders: Record<string, string> = {};
  falRes.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });
  // Allow the browser to read the response.
  responseHeaders["Access-Control-Allow-Origin"] = "*";

  return new NextResponse(falRes.body, {
    status: falRes.status,
    headers: responseHeaders,
  });
}

export async function GET(req: NextRequest) { return proxy(req); }
export async function POST(req: NextRequest) { return proxy(req); }
export async function PUT(req: NextRequest) { return proxy(req); }
export async function DELETE(req: NextRequest) { return proxy(req); }
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-fal-target-url",
    },
  });
}
