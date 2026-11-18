import { NextRequest, NextResponse } from "next/server";

async function proxy(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const base = (process.env.BACKEND_API_URL ?? "http://127.0.0.1:4000/api").replace(/\/$/, "");
  const url = `${base}/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;
  const headers = new Headers();
  for (const name of ["authorization", "content-type"]) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const response = await fetch(url, {
      method: req.method, headers, cache: "no-store",
      body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer(),
      signal: AbortSignal.timeout(20000),
    });
    return new NextResponse(response.body, { status: response.status, headers: { "Content-Type": response.headers.get("content-type") ?? "application/json", "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ message: "The studio API is unavailable. Start both services with npm run dev, then retry." }, { status: 503 });
  }
}
export { proxy as GET, proxy as POST, proxy as PATCH };
