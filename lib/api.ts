// Same-origin Next.js API routes (app/api/*). NEXT_PUBLIC_API_URL overrides it.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("homesketches_access_token") : null;
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers, signal: init.signal ?? AbortSignal.timeout(20000) });
  } catch {
    throw new Error("Cannot reach the studio API. Check your connection and try again.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join(". ") : data.message ?? data.error ?? "The request failed. Please try again.");
  return data as T;
}
