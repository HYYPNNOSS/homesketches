## F01: Saved quote reads and deletes target nonexistent routes

- Severity: High
- Confidence: Confirmed
- Evidence: nglobi/app/app/my-quotes/page.tsx:29,49,67; backend_alexis/src/quotes/quote.controller.ts:38-49
- Root cause / relevant code: Frontend uses singular /quotes/draft for GET/DELETE; backend defines plural /quotes/drafts.
- Trigger and business consequence: Open, resume or delete a saved quote: requests fail and the page can appear empty. Lost conversion and work.
- Recommended solution: Align paths and handle non-OK responses visibly.
- Regression test: Exercise save, list, resume and delete through real HTTP route mapping.

## F02: Customer approvals cannot load pending items

- Severity: High
- Confidence: Confirmed
- Evidence: nglobi/app/app/approvals/page.tsx:37-49; backend_alexis/src/bookings/bookings.controller.ts:49-59; backend_alexis/src/approval/approval.controller.ts:29-45
- Root cause / relevant code: /bookings/my-bookings and /approval/bookings/:id/pending-items do not exist. GET /bookings returns grouped active/previous, not the array the page assumes.
- Trigger and business consequence: Open approvals: failed first request leaves empty state, preventing customer consent and disrupting jobs.
- Recommended solution: Consume /approval/pending and map its items into the view model; distinguish error from empty.
- Regression test: Seed pending items, load page, approve/reject and verify server and driver state.

## F03: Every customer storage return slot is rejected

- Severity: High
- Confidence: Confirmed
- Evidence: nglobi/app/app/dashboard/storage/page.tsx:52,131-142,384-386; backend_alexis/src/storage/dto/storage.dto.ts:23-30
- Root cause / relevant code: ALL_DAY/MORNING/AFTERNOON are not members of Prisma TimeSlot. Actual DTO probes rejected all three.
- Trigger and business consequence: Any return request from this screen receives 400; customers cannot retrieve stored goods through the UI.
- Recommended solution: Share backend slot enum or explicit supported mapping.
- Regression test: Submit each displayed option and assert accepted, correctly scheduled delivery.

## F04: Admin pricing editor submits forbidden response fields

- Severity: Medium
- Confidence: Confirmed
- Evidence: nglobi/app/admin/prices/page.tsx:27-29,46-48; backend_alexis/src/pricing/dto/update-pricing.dto.ts:3-25; backend_alexis/src/pricing/pricing.service.ts:227-237; backend_alexis/src/main.ts:71-76
- Root cause / relevant code: The full GET object including id is submitted to a whitelist DTO with forbidNonWhitelisted. In-memory validation rejects id.
- Trigger and business consequence: Load normal database-backed settings and Save: request fails, blocking pricing changes.
- Recommended solution: Build a payload from writable DTO fields and display validation errors.
- Regression test: Load settings with id/metadata, edit rate, save and refetch the changed value.

## F05: Marketing booking links are redirected back to the homepage

- Severity: High
- Confidence: Confirmed
- Evidence: nglobi/app/services/student-moving/page.tsx:36; nglobi/proxy.ts:64-84
- Root cause / relevant code: A relative /app/book link on the main domain hits a rule redirecting /app paths to /.
- Trigger and business consequence: Prospect clicks quote on the main domain and returns home instead of booking; lost leads.
- Recommended solution: Use canonical portal URLs or route main-domain /app links to the corresponding portal while preserving path/query.
- Regression test: Test each public quote/account CTA on www and all configured portal domains.

## F06: Forgot-password route is redirected into login

- Severity: Medium
- Confidence: Confirmed
- Evidence: nglobi/proxy.ts:4,23-33; nglobi/app/(auth)/forgot-password/page.tsx:18
- Root cause / relevant code: Forgot-password is in AUTH_PAGE_ROUTES, and every non-register member selects login mode.
- Trigger and business consequence: Navigating to recovery never renders the recovery form. Combined with S19, recovery is broken at both layers.
- Recommended solution: Preserve recovery route or provide an explicit recovery modal state.
- Regression test: Navigate to /forgot-password from login and complete mocked reset delivery and redemption.

## F07: Refresh helper is unused by dashboard API callers

- Severity: Medium
- Confidence: Confirmed
- Evidence: nglobi/lib/auth-token.ts:104-119,145-165; nglobi/app/manager/layout.tsx:85-94; nglobi/app/driver/layout.tsx:47-54; nglobi/app/admin/layout.tsx:98-105
- Root cause / relevant code: Source search finds apiFetch/refreshAccessToken only defined/called within the helper. Pages use raw fetch; layouts clear sessions on any non-OK profile response.
- Trigger and business consequence: Expired access token or temporary 500 logs staff out despite a usable refresh token; interrupted dispatch and work.
- Recommended solution: Adopt a common refresh-aware API client and distinguish auth errors from temporary service failure.
- Regression test: Expire access token with valid refresh token; preserve session and replay once. A profile 500 must show retry without deleting credentials.

## F08: Affiliate sign-out leaves shared cookies and server session active

- Severity: Medium
- Confidence: Confirmed
- Evidence: nglobi/app/partner/dashboard/page.tsx:177-182; nglobi/lib/auth-token.ts:41-53,85-92
- Root cause / relevant code: Sign-out deletes localStorage only; getAccessToken restores it from the remaining cookie. No logout request revokes refresh token.
- Trigger and business consequence: Sign out then revisit dashboard or sibling portal: session survives, exposing account on shared devices.
- Recommended solution: Call common logout endpoint and clear all auth cookies/cache consistently.
- Regression test: Sign out affiliate, revisit every portal, and verify old session cannot be restored.

## F09: Staff actions and affiliate settings hide HTTP failures

- Severity: Medium
- Confidence: Confirmed
- Evidence: nglobi/app/manager/fleet/page.tsx:61-81; nglobi/app/manager/documents/page.tsx:116-130; nglobi/app/partner/dashboard/page.tsx:123-132
- Root cause / relevant code: Several mutations await fetch but never inspect response.ok; fetch resolves on 400/403/500.
- Trigger and business consequence: Rejected document/status/profile writes appear completed or close dialogs; staff believe a change was saved.
- Recommended solution: Check response status, preserve edits and show actionable error; update local state only after success.
- Regression test: Mock 400,403,409,500 for each mutation and verify visible failure, unchanged state and retry.

## F10: Extra-time debt display and live status models disagree

- Severity: Medium
- Confidence: Confirmed
- Evidence: nglobi/app/app/dashboard/page.tsx:94-96; nglobi/app/app/dashboard/orders/page.tsx:448-450; nglobi/app/manager/live-rides/page.tsx:128-138; backend_alexis/src/tracking/tracking.gateway.ts:165-166
- Root cause / relevant code: Customer dashboard checks lowercase debt while backend uses DEBT; manager live-rides overwrites booking status with ONLINE location status.
- Trigger and business consequence: Outstanding extra charges disappear on one dashboard; GPS event replaces a booking lifecycle field with connectivity state.
- Recommended solution: Share enums and keep bookingStatus and driverConnectionStatus separate.
- Regression test: Render DEBT fixture consistently across pages; location events must preserve IN_TRANSIT/UNLOADING state.

## F11: Invoice list sends full customer account records to manager browsers

- Severity: Medium
- Confidence: Confirmed
- Evidence: backend_alexis/src/invoices/invoices.service.ts:21-25; backend_alexis/src/invoices/invoices.controller.ts:26-30; backend_alexis/prisma/schema.prisma:11-44
- Root cause / relevant code: include user:true serializes the full User model rather than approved display fields.
- Trigger and business consequence: Any authorized manager invoice listing receives password hash/account fields; credential exposure exceeds UI need.
- Recommended solution: Select explicit name/contact fields and redact recursively.
- Regression test: Assert invoice responses never contain password, provider identifiers or session secrets.

## O01: Secrets and bearer tokens are committed in both repositories

- Severity: Critical
- Confidence: Confirmed
- Evidence: backend_alexis/envtxt:1-17; backend_alexis/env copy:1-7; backend_alexis/.env.azure:1; backend_alexis/token.txt:1; backend_alexis/token2.txt:1; nglobi/envtxt:1-20
- Root cause / relevant code: git ls-files confirms credential-bearing environment copies and JWT-shaped token files are tracked. Values deliberately omitted.
- Trigger and business consequence: Repository/CI artifact readers may obtain credentials. Current validity and past unauthorized use were not tested. Exposure can compromise databases, accounts and service spending.
- Recommended solution: Coordinate rotation/revocation, history cleanup, secret manager migration and preventive scanning. Do not rely on deletion or gitignore alone.
- Regression test: Secret scanner rejects representative token/env fixtures and verifies no real secrets in tracked artifacts/history selected for distribution.

## O02: Public AI endpoints lack application quotas and payload bounds

- Severity: High
- Confidence: Confirmed
- Evidence: nglobi/app/api/ai-assistant/route.ts:65-116; nglobi/app/api/ai-vision/detect/route.ts:73-133; nglobi/proxy.ts:205-216
- Root cause / relevant code: Public Next API routes accept caller-controlled history/base64 and call paid Gemini APIs without auth/quota, application body size bounds or outbound deadline; API routes bypass proxy.
- Trigger and business consequence: Repeated large requests consume model spend and request memory; slow upstream retains requests. Upstream hosting limits may reduce exposure but are not shown.
- Recommended solution: Enforce input size/schema, per-user/IP quotas and spend limits, timeouts and bounded concurrency.
- Regression test: Oversized requests rejected before upstream call; rate limits hold across instances; timeout returns controlled error.

## O03: API readiness and pricing obscure database failures

- Severity: Medium
- Confidence: Confirmed
- Evidence: backend_alexis/src/prisma/prisma.service.ts:16-25; backend_alexis/src/pricing/pricing.service.ts:227-245
- Root cause / relevant code: Database startup failure is swallowed; pricing catches DB errors and returns mock rates.
- Trigger and business consequence: Instance accepts traffic while core operations fail; users may see fallback quotes inconsistent with actual configured rates.
- Recommended solution: Dependency-aware readiness and explicit retryable pricing failure, or clearly versioned last-known-good rates.
- Regression test: Inject DB failure at startup and settings read; readiness fails and no unapproved mock pricing is presented.

## O04: Photo identification route buffers unrestricted uploads and returns mock results

- Severity: Medium
- Confidence: Confirmed
- Evidence: backend_alexis/src/items/items.controller.ts:55-66; backend_alexis/src/items/items.service.ts:109-137
- Root cause / relevant code: Public FileInterceptor has no fileSize limit; handler ignores image content and returns static items.
- Trigger and business consequence: Large multipart upload consumes memory; any caller relying on advertised identification gets invented inventory. Current frontend primarily uses Gemini, so this is a separate exposed API.
- Recommended solution: Bound uploads and remove or clearly disable unfinished endpoint until actual validated detection exists.
- Regression test: Oversized image rejected; different supported inputs cannot return unconditional mock results.

## O05: Deployment pipeline has no behavioral test gate

- Severity: High
- Confidence: Confirmed
- Evidence: backend_alexis/.github/workflows/azure-deploy.yml:3-6,31-62; backend_alexis/test/app.e2e-spec.ts:10-26; backend_alexis/package.json:9-23
- Root cause / relevant code: Push to main installs, builds and deploys without tests. Only conventional e2e spec boots real AppModule and expects scaffold Hello World; runtime src has no unit specs.
- Trigger and business consequence: Type-correct security/payment regressions deploy automatically. Running existing e2e can initialize real DB/schedulers, so it was deliberately not run.
- Recommended solution: Isolated test database and fake services; require authorization, payment, race and dashboard contract tests before deployment.
- Regression test: Fail a business invariant test and assert deployment job is blocked; verify test process cannot reach production endpoints.

## O06: Socket rooms and broadcasts are local to each process

- Severity: Medium
- Confidence: Requires Runtime Verification
- Evidence: backend_alexis/src/tracking/tracking.gateway.ts:40-44,173-192; backend_alexis/src/main.ts:16-18; backend_alexis/src/tracking/tracking.module.ts
- Root cause / relevant code: No shared Socket.IO adapter is configured in inspected runtime wiring.
- Trigger and business consequence: With multiple instances, mutation on A broadcasts only to A sockets; B clients miss assignments and locations. Actual replica count/stickiness requires runtime verification.
- Recommended solution: Configure supported shared adapter and load balancer transport/session behavior; keep REST resync.
- Regression test: Two isolated app instances: user on B receives mutation from A; reconnect and transport upgrade work.

## O07: Installed dependencies have published security advisories

- Severity: High
- Confidence: Confirmed
- Evidence: nglobi/package-lock.json (node_modules/next 16.2.4); backend_alexis/package-lock.json (nested platform-express multer 2.0.2, engine.io 6.6.6); audit npm JSON evidence and dependency table below
- Root cause / relevant code: Locked runtime packages fall within advisory ranges. npm audit reports 60 backend and 42 frontend affected package entries, including development/transitive entries, not 102 independently demonstrated exploits.
- Trigger and business consequence: Known framework/multipart/socket denial-of-service exposure needs remediation; other scanner critical findings have configuration-specific conditions not demonstrated here.
- Recommended solution: Upgrade affected dependency chains after compatibility review, rerun audit, then exercise app regression suite. Do not run automatic force upgrades without review.
- Regression test: Verify lockfile no longer includes affected versions and regress valid/rejected uploads, RSC requests and socket reconnects.
