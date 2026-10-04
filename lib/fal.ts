/**
 * lib/fal.ts
 * Pre-configured fal.ai client (v1.x).
 * All browser requests are routed through /api/fal (our Next.js proxy)
 * so the FAL_KEY is never exposed in the browser.
 */
import { fal } from "@fal-ai/client";

// ─── Inline proxy middleware (avoids importing from @fal-ai/client/src/) ──────
// The fal client (1.x) uses requestMiddleware to intercept every outgoing
// request. We rewrite the URL to our Next.js proxy (/api/fal) and pass
// the original fal URL in the x-fal-target-url header.
const FAL_PROXY_URL = "/api/fal";

fal.config({
  requestMiddleware: async (request) => {
    // Only redirect when running in the browser.
    if (typeof window === "undefined") return request;
    
    // Only proxy actual fal API calls, NOT presigned storage upload URLs.
    // Initiate upload hits rest.fal.ai (needs proxy).
    // The actual PUT upload hits storage.fal.ai or others (must go direct).
    const url = request.url;
    const isFalApi = url.startsWith("https://rest.fal.ai") || 
                     url.startsWith("https://queue.fal.run") ||
                     url.startsWith("https://fal.run");
                     
    if (!isFalApi) {
      return request;
    }

    return {
      ...request,
      url: FAL_PROXY_URL,
      headers: {
        ...(request.headers ?? {}),
        "x-fal-target-url": request.url,
      },
    };
  },
});

export { fal };

// ─── Model IDs ────────────────────────────────────────────────────────────────

export const FAL_MODELS = {
  /** Image → cinematic video clip */
  video: "fal-ai/kling-video/v1.6/standard/image-to-video",

  /** Image → textured GLB 3D model */
  "3d": "fal-ai/triposr",

  /** Image → clean architectural floor plan render */
  "floor-plan": "fal-ai/flux/schnell",

  /** Image(s) → walkthrough video */
  walkthrough: "fal-ai/luma-dream-machine",
} as const;

export type FalModel = (typeof FAL_MODELS)[keyof typeof FAL_MODELS];
