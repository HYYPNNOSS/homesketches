# Remediation progress after the forensic audit

This records source changes made after `FULL_SYSTEM_FORENSIC_AUDIT.md`. The forensic report remains the original snapshot. Status is conservative: “Source fix” means a code path was changed and type checked; deployment behavior still needs acceptance tests. “Mitigated” means only the immediate trigger was blocked or narrowed. Every other finding remains open.

Current ledger status is computed from the table below. No production readiness is claimed until the external gates and every remaining finding are closed.

| ID | Severity | Status | Finding |
|---|---|---|---|
| FIN-01 | Critical | Source fix; live Stripe/browser runtime verification pending | Customer can mark an invoice paid without paying |
| O01 | Critical | BLOCKED — EXTERNAL ACTION REQUIRED (credential rotation, token revocation, history cleanup) | Secrets and bearer tokens are committed in both repositories |
| S01 | Critical | Source fix; runtime verification pending | Public registration can create ADMIN and MANAGER accounts |
| S02 | Critical | Source fix; handler regressions passed, live authenticated Socket.IO acceptance pending | Unauthenticated sockets can watch bookings and forge driver GPS |
| F01 | High | Source fix; runtime verification pending | Saved quote reads and deletes target nonexistent routes |
| F02 | High | Source fix; runtime verification pending | Customer approvals cannot load pending items |
| F03 | High | Source fix; runtime verification pending | Every customer storage return slot is rejected |
| F05 | High | Source fix; runtime verification pending | Marketing booking links are redirected back to the homepage |
| FIN-02 | High | Source fix; isolated MySQL deposit/balance runtime verified, live Stripe/browser pending | Balance payment charges total again after deposit |
| FIN-03 | High | Source fix; isolated MySQL deposit plan verified, browser amount presentation pending | Advertised deposit is charged as full total |
| FIN-04 | High | Mitigated; extra-time isolation unit tested, full runtime pending | Extra time and principal intents collide; paid principal blocks extra-time settlement |
| FIN-05 | High | Source fix; isolated MySQL runtime verified, live Stripe/orphan reconciliation pending | Concurrent intent creation has no effective idempotency |
| FIN-06 | High | Source fix; isolated MySQL runtime verified, live Stripe and legacy reconciliation pending | Webhook commits payment success before fulfillment and skips failed work on retry |
| FIN-07 | High | Source fix; runtime verification pending | Failed then successful payment remains locally FAILED |
| FIN-08 | High | Mitigated; isolated MySQL late-charge/refund retry verified, live Stripe race pending | Cancellation can leave a paid charge with a cancelled job |
| FIN-09 | High | Source fix; isolated MySQL pending refund polling verified, live Stripe reconciliation pending | Refund failures are swallowed after irreversible cancellation state |
| FIN-10 | High | Mitigated; late/customer-paid changes require staff financial settlement, automated fee/refund flow open | Customer cancellation has no financial settlement; reschedule fees are only returned |
| FIN-11 | High | Source fix; address changes on UNPAID bookings now reprice server-side; paid bookings fail closed; unit tested (8 settlement scenarios pass); live browser/geocoding runtime pending | Address and inventory edits bypass repricing |
| FIN-12 | High | Source fix; runtime verification pending | Client coordinates control authoritative route price |
| FIN-13 | High | Source fix; runtime verification pending | FULL_HOUSE bypasses all item validation |
| FIN-14 | High | Source fix; runtime verification pending | Storage delivery can reference another customer’s goods |
| FIN-15 | High | Source fix; Stripe/browser runtime verification pending | Storage deliveries are scheduled before collecting their charge |
| FIN-17 | High | Source fix; schema rollout and full checkout runtime pending | Promo limits can be exceeded by multiple unpaid bookings |
| FIN-18 | High | Source fix; historical reward backfill and full checkout runtime pending | Referral reward can be replayed through paid then cancelled first bookings |
| O02 | High | Source fix; isolated Redis quota verified, production Redis/budget monitoring pending | Public AI endpoints lack application quotas and payload bounds |
| O05 | High | Source fix; CI execution pending | Deployment pipeline has no behavioral test gate |
| O07 | High | FIXED — RUNTIME VERIFIED (npm audit, builds, tests) | Installed dependencies have published security advisories |
| S03 | High | Source fix; runtime verification pending | Driver socket subscription reads the wrong JWT identity field |
| S04 | High | FIXED — RUNTIME VERIFIED (isolated MySQL) | Logout/password reset do not revoke seven-day access tokens |
| S05 | High | Source fix; isolated Redis remote eviction verified, live role/session revocation pending | Manager socket permissions survive demotion and token expiry |
| S06 | High | Source fix; runtime verification pending | Default manager password is shared and predictable |
| S07 | High | Source fix; runtime verification pending | Admin assignment bypasses booking payment, state and driver checks |
| S08 | High | Source fix; isolated MySQL concurrency verified, production slot backfill pending | Assignment checks race with cancellation and other assignments |
| S10 | High | Source fix; runtime verification pending | Delivered state commits before rewards, debt and invoice transaction |
| S11 | High | Source fix; isolated service/DTO tests passed, cash reconciliation workflow absent | Driver status endpoint bypasses DTO and accepts arbitrary financial extras |
| S13 | High | Source fix; runtime verification pending | Driver undo can overwrite a concurrently completed booking |
| S14 | High | Source fix; runtime verification pending | Withdrawal requests can overdraw the wallet concurrently |
| S17 | High | BLOCKED — EXTERNAL ACTION REQUIRED (private GCS bucket and legacy object migration) | Public upload/download exposes private driver documents and accepts arbitrary content |
| S18 | High | Source fix; runtime verification pending | GCS failure silently saves documents to ephemeral local disk |
| S19 | High | BLOCKED — EXTERNAL ACTION REQUIRED (mail provider key and sender) | Password reset never sends email and logs the reset credential |
| S21 | High | Source fix; runtime verification pending | Refresh tokens collide within a second and rotation may reissue the same token |
| F04 | Medium | Source fix; runtime verification pending | Admin pricing editor submits forbidden response fields |
| F06 | Medium | Source fix; runtime verification pending | Forgot-password route is redirected into login |
| F07 | Medium | Mitigated; more work needed | Refresh helper is unused by dashboard API callers |
| F08 | Medium | Source fix; runtime verification pending | Affiliate sign-out leaves shared cookies and server session active |
| F09 | Medium | Source fix; runtime verification pending | Staff actions and affiliate settings hide HTTP failures |
| F10 | Medium | Source fix; runtime verification pending | Extra-time debt display and live status models disagree |
| F11 | Medium | Source fix; runtime verification pending | Invoice list sends full customer account records to manager browsers |
| FIN-16 | Medium | FIXED — RUNTIME VERIFIED (isolated MySQL) | Concurrent first storage deliveries both become free |
| FIN-19 | Medium | Mitigated; assigned rescheduling requires staff workflow | Customer booking updates race fulfillment and retain conflicting assignment |
| FIN-20 | Medium | Mitigated; more work needed | Booking plus linked storage and invoice state are not atomic |
| FIN-21 | Medium | Source fix; HTTP runtime verification pending | Pricing preview does not apply authenticated promo eligibility |
| FIN-22 | Medium | Source fix; runtime verification pending | Storage duration price differs between quote and booking |
| FIN-23 | Medium | Mitigated; more work needed | Date and integer validation does not match database/business constraints |
| FIN-24 | Medium | Source fix; runtime verification pending | Saved quote expiry is stored but not enforced |
| FIN-25 | Medium | Source fix; runtime verification pending | Referral dashboard tiers disagree with paid reward policy |
| FIN-26 | Medium | Source fix; unit tested (5 renewal cron scenarios pass); live Stripe off-session and production nextBillingAt backfill pending | Storage subscription renewal and inventory ingestion are absent from runtime source |
| FIN-27 | Medium | Mitigated; more work needed | Monetary ledger persists binary floats |
| FIN-28 | Medium | Open | External route services are sequential dependencies for checkout |
| O03 | Medium | Source fix; isolated HTTP MySQL/Redis readiness verified, production probe configuration pending | API readiness and pricing obscure database failures |
| O04 | Medium | Mitigated; feature disabled | Photo identification route buffers unrestricted uploads and returns mock results |
| O06 | Medium | Source fix; isolated two-server Redis runtime verified, production Redis pending | Socket rooms and broadcasts are local to each process |
| S09 | Medium | Mitigated; assignment race and route batching runtime verification pending | Driver availability and actual exact pickup time are not enforced by assignment |
| S12 | Medium | Source fix; runtime verification pending | Delivery proof photo is discarded by the controller |
| S15 | Medium | Source fix; required-set tests passed, full onboarding browser/runtime pending | Driver onboarding/approval is non-atomic and inconsistent across roles |
| S16 | Medium | Source fix; isolated MySQL stale-review test passed, concurrent transaction test pending | Approved drivers can replace reviewed documents without reapproval |
| S20 | Medium | FIXED — RUNTIME VERIFIED (isolated MySQL) | OAuth codes and password resets are stored only in process memory |
| S22 | Medium | Source fix; runtime verification pending | Cookie authentication fallback is not wired into Express |
| S23 | Medium | Source fix; runtime verification pending | Apple callback path differs from registered controller path |
| S24 | Medium | Source fix; runtime verification pending | Personal notification socket rooms are never joined |
| S25 | Medium | Source fix; runtime verification pending | Admin booking responses disclose password hashes |
| S26 | Medium | Open | Operational lists load all bookings, documents and large proof blobs |
| S27 | Medium | Mitigated; more work needed | Fleet recommendation claims random proximity and understates oversized vehicles |
| S28 | Medium | Source fix; runtime verification pending | Admin revenue includes unpaid and cancelled carts |
| S29 | Medium | Source fix; runtime verification pending | OAuth identity linking by email permits pre-account takeover and missing state binding |
| S30 | Medium | Mitigated; booking audit atomicity remains | Audit persistence failures are swallowed and privileged account actions lack audit trails |

## Validation

- Both projects passed `tsc --noEmit --incremental false --pretty false` after the changes.
- Backend Jest: 10 suites, 30 tests passed for public registration roles, payment amounts and event order, concurrent intent keying, refund failure propagation, withdrawal races, driver charge validation, cookie extraction, booking input boundaries, replacement document review, fleet recommendations, storage billing weeks, and referral tiers.
- Additional in-memory probes passed for invoice fail-closed behavior and socket ownership.
- `git diff --check` passed in both repositories.
- Existing `.eslintrc.js` modification and Graphify output were present before this work. No production services, databases or credentials were changed.

## 2026-11-06 continuation checkpoint

- FIN-11: price-changing address and inventory edits now fail closed; driver notes no longer incur an unintended fee. This is a mitigation because a priced edit workflow still needs to be built. Backend regression tests pass.
- FIN-15: paid storage returns now start in `PENDING_PAYMENT`; the dashboard opens Stripe Payment Element and can resume an unpaid return; verified local payment success changes it to `SCHEDULED`. Backend unit tests and both type checks pass. Real Stripe/browser webhook runtime remains unverified and the enum must be rolled out to production before deployment.
- FIN-16: first free return allocation uses a serializable MySQL transaction and retry. The isolated localhost MySQL concurrency test passed with exactly one free scheduled return and one £25 pending return. Marked runtime verified for this race.
- FIN-17: booking creation now atomically increments the reserved promo count and inserts a unique customer reservation in its transaction. Payment settles the reservation once; unpaid cancellation releases it. Isolated MySQL tests passed concurrent last slot, same customer concurrency, settlement retry, and cancellation release. Full booking/Stripe runtime plus production schema migration remain.
- FIN-18: a unique referral reward record gates wallet credit; refund reverses it once and keeps the record to bar replay. Isolated MySQL refund/replay test passed. Existing historical rewards need a migration/backfill before deployment; full checkout runtime remains.
- FIN-19: assigned bookings require staff assisted rescheduling; customer updates use status/version checks. Backend regression tests pass; a full scheduling workflow remains.
- FIN-21: optional JWT guard now attaches authenticated identity to pricing and promo preview; callers send the token when present. Invalid presented tokens are rejected. Guard tests and both type checks pass; HTTP runtime remains.
- Current verification: backend Jest 14 suites/43 tests passed with three isolated DB suites gated off by default; all three isolated DB suites/6 tests passed separately. Both projects passed `tsc --noEmit --incremental false --pretty false`; both repositories passed `git diff --check` before this checkpoint. Production credentials, Stripe, databases, and deployment were not touched.
- Current next action: inspect FIN-01 invoice settlement and remaining high findings. Do not claim production readiness. Preserve all existing uncommitted work.

## Invoice settlement continuation

- FIN-01: invoice card payments now create an invoice-linked Stripe intent. Only a matching, amount-checked, verified success event marks the invoice `PAID`; both customer self-settlement and manager manual mark-paid endpoints reject unsupported settlement. The business invoice page opens Stripe Payment Element. Backend unit tests passed, and an isolated MySQL test confirmed the invoice remains unpaid before success, becomes paid after the event, and handles replay. Real Stripe and browser verification remain outstanding.
- O01 cannot be closed with repository edits: credential issuers must rotate exposed secrets, revoke committed tokens, verify unauthorized use, and coordinate history cleanup. Treat as an external deployment block.
- Next action: continue remaining high-severity payment and security findings, then run full suite/build and refresh status counts. No deployment or production mutations.

## Dependency and test gate continuation

- O07: removed unused frontend transformers and shadcn CLI packages; vendored the MIT-licensed stylesheet that shadcn supplied. Upgraded Next to 16.4.5, aligned eslint-config-next, upgraded GCS client, migrated Nest packages together to v12 and TypeScript 6, and replaced Jest with Vitest for Node 22 compatibility. Both full npm audits now report **zero advisories**, including development dependencies. The frontend production build and lint pass; the backend build and all 51 Vitest tests pass, including four isolated MySQL suites. This verifies the installed local dependency trees, not production runtime behavior.
- O05: backend Azure workflow now uses Node 22, has an isolated MySQL service and schema, runs production npm audit and all unit/database tests before deploy. Docker and Azure settings template use Node 22. Workflow execution on GitHub Actions is still pending, so this is a source fix only.
- Frontend `SiteChrome` now has stable list keys and restores menu focus by element ID; this resolved the 12 lint errors surfaced by the updated ESLint rules.
- The direct backend ESLint check still reports existing Prettier formatting errors in edited files; parser execution works. The repository's `npm run lint` script includes `--fix`, so it was not run against the whole tree to avoid rewriting unrelated files.
- Current next action: remaining open FIN-26, FIN-28, O06, S09, S26, S30 plus partially mitigated high findings. Continue without deployment.

## Immediate remaining work

- Critical O01: rotate exposed credentials and revoke tokens through the infrastructure owners, then remove historic exposure. Repository file edits alone cannot rotate live credentials.
- Critical FIN-01: implement a real invoice payment flow or verified bank-transfer reconciliation; the fake payment route now rejects requests and the UI shows an arrangement message.
- S02: current socket room checks still need cross-instance and demotion eviction validation.
- FIN-02/03/04: amount calculation is corrected in the core intent path, but Stripe idempotency, concurrent reservation and full webhook reconciliation are outstanding.
- FIN-07 now accepts verified Stripe success after a failed card attempt and checks amount/currency against the local ledger. FIN-06 replay now retries booking fulfillment after a SUCCEEDED ledger write, but failure after booking status changes can still strand referral or audit effects. An atomic confirmation/outbox is still required.
- FIN-05 now derives a stable Stripe idempotency key from target, purpose, amount, and latest local payment, and handles the unique Stripe-intent row race. A durable database reservation and orphan reconciliation are still needed before treating concurrent payments as fully safe.
- S11 now rejects negative or oversized extras and unsupported driver-asserted card payments; the driver dashboard only offers cash and debt. Cash collection itself remains unverified.
- S13 uses a conditional status update to prevent undoing a concurrent transition. S18 now fails cloud uploads rather than returning ephemeral local URLs; legacy local reads remain available.
- F09 checks failed staff and partner mutations and keeps review/profile dialogs open on error. S22 reads auth cookies directly from Express headers when `req.cookies` is unavailable.
- FIN-23 now bounds integer quantities and dimensions, validates return slots, and rejects past dates on booking, reschedule, and storage delivery routes. It still needs runtime checks for all scheduling and DST boundaries.
- S16 now moves an approved driver back to pending when a reviewed document is replaced, while keeping their role for existing assignments. Concurrent review/upload behavior still needs a database-backed end-to-end check.
- S27 removes the random proximity score and reports multi-van capacity instead of recommending one undersized vehicle. Fleet data still lacks actual vehicle capacity and route proximity.
- FIN-12 pricing no longer uses client supplied coordinates; the submitted coordinates still need server verification before persistence. FIN-13 runs nested item validation even for FULL_HOUSE, while allowing an empty full-house item list because home size pricing covers that route.
- S05 now disconnects sockets on token expiry and rechecks role every 30 seconds, evicting demoted manager/driver rooms. An immediate cross-instance eviction channel is still required for zero-gap revocation.
- FIN-09 no longer swallows Stripe refund errors, only records a completed refund, and lets managers retry cancellation with a stable Stripe key. Pending refund reconciliation and customer cancellation settlement remain open.
- O04 now returns an explicit unavailable response without buffering multipart data or inventing identified inventory. The feature needs a real model integration before it can be enabled.
- O02 now bounds both public Gemini request bodies, validates message/image shapes, and times out upstream calls. Shared per-user/IP quotas, spend caps, and concurrency controls remain required across instances.
- FIN-22 uses one whole-week storage duration rule for price preview and booking creation. FIN-25 counts only settled referrals and reads configured tier thresholds/rewards instead of hardcoded values.
- F07 now uses the refresh-aware API wrapper on the main customer dashboard, including payment and storage mutations. Other role/dashboard callers still need conversion. The extra-time checkout now requests the extra-time purpose and only opens for a persisted debt, not a live estimate.
- The other open findings, including refunds, rewards, private uploads, dependency upgrades and storage billing, still need implementation and regression checks.
- The source snapshot remains **unsafe to deploy** until critical/high findings and regression gates are completed.

## Delivery transaction correction

S10: Driver status, rewards, debt and invoice writes now share one Prisma transaction. The conditional status write also checks the assigned driver. An isolated failure/retry regression test passed; real MySQL rollback/concurrency verification remains a release gate. Notifications and audit logging still run after commit and are covered by the remaining audit/notification reliability work.

## Invoice and assignment corrections

FIN-20: Invoice creation and booking confirmation now share a transaction, with a conditional PENDING status write. A simulated invoice failure regression test verifies rollback and suppression of subsequent audit calls. Linked storage creation remains outstanding.

S08: Assignment writes now require the booking status and updatedAt value read during validation; missing or duplicate driver IDs are rejected. Cross-booking driver reservations remain outstanding and require concurrent database tests.

## 2026-11-06 continuation checkpoint

- Generated Prisma client and pushed current schema to a disposable MySQL 8 container `nglob-remediation-mysql` on 127.0.0.1:33307, database `remediation`; repository `.env` was not used for the push.
- Isolated MySQL probes passed: revoked session rejected by JwtStrategy; OAuth code single use; password reset single use. Backend Jest 12 suites / 33 tests passed. Both projects type checked before the latest auth/mail changes; rerun both type checks after those edits.
- S04 and S20 have isolated runtime evidence. S19 source sends via Resend and never logs the link; production requires `RESEND_API_KEY`, `PASSWORD_RESET_FROM_EMAIL`, and a verified sender. S17 source uses a private GCS bucket and authenticated proxy; production requires `GCP_PRIVATE_STORAGE_BUCKET` with public access prevention and migration/revocation of old public objects. O01 still requires real credential rotation and historic exposure cleanup.
- Current source edits this continuation: `backend_alexis/src/payments/payment-state.util.ts`, `src/auth/auth.service.ts`, `src/auth/auth.controller.ts`, `src/auth/password-recovery.spec.ts`, `src/tracking/tracking.gateway.ts`, `src/driver/private-files.service.ts`, `src/driver/driver.service.ts`, `src/driver/driver.service.spec.ts`, `src/driver/private-files.service.spec.ts`; frontend `nglobi/app/actions/upload.ts`, `app/driver/apply/documents/page.tsx`, `components/booking/AddItemsModal.tsx`, `lib/image-url.ts`, `app/api/private-files/[filename]/route.ts`. Additional auth/private file edits were already present from interrupted agents.
- Next action: run backend and frontend type checks plus Jest; then trace FIN-10 customer cancellation settlement and FIN-11 repricing. Do not use live Stripe or production database.

## 2026-11-06 continuation update

- FIN-10 customer cancellation now rejects paid/invoiced bookings before changing status; fee-bearing reschedules reject until staff-assisted payment. Jest 13 suites / 35 tests pass, including two settlement guards. Full refund/fee collection remains open.
- S17 source includes a private-file backend, authenticated upload/read endpoints, owned document-reference checks, and a Next proxy for image reads. Frontend direct and server-action uploads now provide authentication. Production private bucket and legacy public-object migration remain external gates.
- S19 uses Resend when `RESEND_API_KEY` and `PASSWORD_RESET_FROM_EMAIL` are configured; email delivery is mocked in tests, never sent live. Isolated MySQL reset and replay checks passed. Without production sender configuration recovery stays unavailable.
- FIN-27 payment-state calculations now compare integer pence, but persisted monetary Float columns remain; status mitigated.
- Next finding: FIN-11 address/item edits require authoritative repricing or a fail-closed workflow. Review `src/bookings/bookings.service.ts:updateAddresses/updateItems` and frontend callers.

## Assignment schedule continuation

- S09: assignment now parses the actual `EXACT` pickup time, validates the input as HH:MM, rejects overlapping few-item jobs, and checks each driver/crew member against their configured shift and the full job duration plus travel buffer. Targeted assignment and DTO regression tests pass. Cross-booking assignment concurrency (S08) and a real route batching/capacity policy remain; do not claim dispatch readiness yet.
- Next finding: S30 audit persistence and privileged account actions. Preserve the existing root-level deletions and other uncommitted changes.

## Account audit continuation

- S30: `AuditService.logChange` now propagates database failures. Added `account_audit_logs` and transactional actor/action/before/after records for admin manager creation, approval, rejection, removal, and manager/admin driver review. Admin driver review delegates to the document-checked manager path. The account role/status mutation rolls back if its audit record fails. Isolated MySQL tests verified manager demotion and driver rejection rollback, plus successful audit records; full backend suite passed 20 files/57 tests. Production schema rollout and transactional booking audit work remain. No production database was touched.
- Next finding: FIN-06 payment webhook fulfillment after ledger success, including crashes/retries after booking confirmation.

## Payment fulfillment continuation

- FIN-06: verified success now claims the payment row and commits its `SUCCEEDED` status, `fulfilledAt` marker, booking confirmation, referral reward/wallet/history/notification, promo settlement, audit record, invoice settlement and storage return scheduling in one Prisma transaction. A persisted notification survives broadcast failure. The isolated MySQL failure-injection test confirmed rollback of all effects before retry, followed by one settlement across duplicate events. Full backend suite passed 21 files/58 tests. The isolated schema was updated; production schema rollout and live Stripe webhook behavior remain release gates.
- FIN-08 remains open for the paid-after-cancel race: the webhook now refuses to fulfill a cancelled booking, but automatic refund/reconciliation is not yet implemented.
- Next finding: FIN-05 durable intent reservation before Stripe creation and orphan event recovery. Preserve the local MySQL test data and all existing worktree changes.

## Intent reservation continuation

- FIN-05: a durable `payment_intent_reservations` row is created before Stripe, stores the idempotency key and target/amount/purpose, and saves the Stripe intent ID for later retries. A signed success webhook can reconstruct a missing local `Payment` from that reservation after a worker or database insert failure. Isolated MySQL tests passed reservation persistence across a simulated Stripe timeout, stable retry key, and orphan invoice payment recovery; full backend suite passed 21 files/60 tests. Live Stripe concurrency and a scheduled orphan reconciliation process remain unverified.
- Next finding: FIN-08 and FIN-09 paid-after-cancel and refund failure reconciliation, especially pending payment attempts and webhook races.

## Cancellation and refund continuation

- FIN-08: verified success for an already cancelled booking is persisted as `SUCCEEDED`, then refunded using a stable Stripe key; a failed or pending refund remains visible and retryable. Manager cancel/decline now reject unresolved card attempts, and abandoned checkout expiry excludes any cart with a payment row. An isolated MySQL test verified a late paid charge remains recorded after a pending refund and is eventually marked `REFUNDED`; another test verified old carts with pending payments are not auto-cancelled. Intent-only races and live Stripe timing still need verification.
- FIN-09: refund processing saves `stripeRefundId`, retrieves its current status on retry, checks Stripe for a prior refund before creating another, and a 10-minute reconciliation task retries cancelled bookings with `SUCCEEDED` payments. Isolated MySQL test verified pending refund polling and no second Stripe refund create. Production job execution and Stripe API responses remain unverified; terminal failed/partial refunds require operator reconciliation.
- Next finding: S08 cross-booking assignment concurrency and driver reservation, then FIN-02/03/04 full deposit/balance lifecycle and remaining high findings.

## Assignment reservation continuation

- S08: added unique driver/day/15-minute assignment slots. Assignments replace their slots, update the booking, and write the assignment audit in one serializable MySQL transaction. Manager cancellation, decline and requeue release slots transactionally. An isolated concurrent MySQL test forced both requests past a stale preflight read; exactly one acquired the driver and only its booking owned slots. Full backend suite passed 23 files/63 tests. Existing assigned production bookings require a checked backfill before this table can enforce conflicts against them; high-volume dispatch and lock contention remain unverified.
- Next finding: FIN-02/03/04 deposit, balance and extra-time settlement through verified payment events.

## Deposit and checkout continuation

- FIN-02/03: intent responses now include the authoritative charge amount, available deposit quote and principal balance. The customer modal displays those values, remounts Stripe Elements on intent change, and validates the amount before showing the pay button. Verified webhooks persist the actual deposit and remaining balance; an isolated MySQL test passed £40 deposit then £160 balance on a £200 booking, ending with zero due. Another test showed an overlapping £40 deposit intent after a £100 full payment is refunded once instead of charging £140 total. Live Stripe/browser verification remains.
- FIN-04: extra-time checkout hides deposit/invoice choices and uses the returned debt amount. The principal versus extra-time purpose remains separated in the backend intent lookup and webhook; only unit tests cover the extra-time lifecycle so far.
- BUSINESS invoice checkout now chooses invoice before creating a card intent. The backend rejects switching an existing card attempt to invoice, and a late card charge against an invoiced booking enters the refund path. Frontend type check, lint and production build passed before the final invoice-choice UI change; rerun build. Invoice payment reward/promo finalization and live business checkout remain outstanding.
- Backend full isolated MySQL suite passed 23 files/65 tests; backend production build passed before the final invoice guard change. Next finding: finish invoice paid side effects, then remaining high issues.

## Invoice settlement completion and validation

- BUSINESS users now choose card or Net 30 invoice before a card intent is created. A failed invoice request keeps the booking ID for retry. The backend blocks invoice conversion once a card payment row exists and refunds a late card success on an invoiced booking. On verified invoice payment, the same transaction now settles the booking's promo reservation, referral reward/wallet/history/notification and remaining balance. Referral tier counts exclude unpaid invoices. An isolated MySQL test verified no reward or promo use before invoice payment and exactly one of each after webhook replay. Frontend lint, type check and production build pass; backend production build and full isolated MySQL suite pass (23 files/66 tests). Browser/live Stripe invoice acceptance remains outstanding.
- Next finding: critical S02 socket ownership, event authorization and forged driver position, then S05/O06 cross-instance eviction and delivery.

## Socket authorization and scale continuation

- S02: sensitive subscribe and GPS handlers now recheck the persisted session and current role. Booking rooms reject unrelated customers and demoted managers; driver rooms require an approved owned driver. GPS rejects malformed coordinates, unknown or completed jobs, other drivers, and updates faster than once per second; a failed database write no longer broadcasts a position. Handler regression tests pass for unauthorized connections, ownership, demotion, active assignment, rate limiting and failed persistence. A full authenticated browser/Socket.IO acceptance test remains.
- O06: added a Socket.IO Redis adapter and WebSocket-only clients so broadcasts reach all instances without polling session affinity. Production startup requires `REDIS_URL`; the Azure settings template now points at a Key Vault secret. A test connected clients to two separate local Socket.IO servers backed by isolated Redis on 127.0.0.1:33308 and verified a tracking-room broadcast reached the other server. Full backend suite passed 25 files/71 tests with isolated MySQL and Redis; backend build, frontend type check and lint pass. The Redis service must be private, access controlled and available before production deployment. [Nest adapter guidance](https://docs.nestjs.com/websockets/adapter) and [Socket.IO Redis adapter security notes](https://socket.io/docs/v4/redis-adapter) support the chosen setup.
- S05: reconnect now refreshes expired access tokens; zero-gap cross-instance role/session eviction is still open. Next finding: S05 immediate eviction and then remaining high issues.

## 2026-11-07 session eviction and AI quota continuation

- S05: logout, logout-all, password reset, refresh rotation and staff role/status changes now disconnect all Socket.IO connections in the user's room. The Redis two-server regression confirmed a disconnect issued on one server reaches a socket on another server. Handler session/role checks remain in place. Live browser and production Redis acceptance is pending.
- O02: both public Gemini routes now acquire an atomic Redis quota after validating payloads and release their shared concurrency slot after upstream completion or failure. The default budget is 40 assistant calls/IP/day, 10 vision calls/IP/day, 1,000 weighted global units/day and 8 concurrent requests; vision costs 10 units. A disabled or unavailable Redis fails closed. An isolated Redis test passed concurrent IP limiting, cross-IP global budgeting and concurrency release (3 tests). Production `REDIS_URL`, trusted proxy IP headers and spend monitoring remain deployment gates.
- Frontend and backend production builds passed after these changes. Next finding: S11 driver cash collection and financial status, then FIN-10 cancellation settlement. Do not deploy or touch production services.

## Driver financial status continuation

- S11: the driver API and driver dashboard no longer accept or offer a cash-paid assertion for extra items or time, because the application has no cash receipt or reconciliation record. Extra charges must use debt, paired with the corresponding item/time and status. Extra packing materials now add to a personal customer's outstanding debt; business invoices already include them. The isolated service test rejects a forged cash claim before a DB transaction, the DTO test rejects cash, and the full backend suite passed 26 files/75 tests. Both projects type checked. Existing historical cash records still require reconciliation; extra packing labor has no defined hourly tariff, so its billing remains a financial gap.
- Next finding: FIN-10 customer cancellation and fee settlement. No live Stripe or production database operations.

## Cancellation and readiness continuation

- FIN-10: late cancellations with a nonzero policy fee now fail closed even for unpaid carts; previously they changed to CANCELLED while only returning an uncollected fee. Customer detail now directs paid, invoiced or late cancellation requests to support and only offers immediate cancellation for unpaid bookings outside the fee window. Existing paid cancellations still need a complete fee retention/refund flow; this is a mitigation, not completion. The regression test covers the formerly fee-free late path.
- O03: added `/api/health/live` and `/api/health/ready`; readiness checks actual MySQL and Redis connectivity and returns HTTP 503 on dependency failure. An isolated HTTP test passed 200 with both services and 503 with Redis unavailable; a unit test verifies DB failure is unavailable. CI now provisions isolated Redis, so its Redis and readiness suites will execute. Production health probe configuration is still pending. Pricing settings already propagate DB failures.
- Full backend suite passed 28 files/79 tests; both production builds and type checks passed. Next: complete remaining high financial findings, beginning with FIN-10 automated settlement design and FIN-11 repricing. Production remains unsafe to deploy.

## Driver document review continuation

- S15: the required driver document list is now shared by application and manager approval. Submission requires every required uploaded document; manager approval requires every required document to have a file, upload timestamp and APPROVED review state. The approval regression rejects a legacy profile with only one approved document. Application creation was already transactional. Browser onboarding remains unverified.
- S16: document review now carries the version (`uploadedAt`) displayed to the manager, checks it inside a serializable transaction, conditionally updates the exact document version, writes an account audit record in the same transaction, and demotes/disconnects an approved driver if a document is rejected. Both manager review screens send the version. An isolated MySQL test verified a replaced document cannot be approved through a stale review, current-version review is audited, and rejection demotes the driver. Simultaneous upload/review contention still needs a dedicated race test.
- Full backend suite passed 30 files/82 tests; both production builds passed.

## 2026-11-07 session continuation and final state

- S01 `registration-http.db.spec.ts`: the HTTP registration role boundary test (guards that ADMIN/MANAGER/DRIVER roles are rejected at the controller level and no user row is created) was completed. When `REMEDIATION_DATABASE_URL` points to the isolated MySQL instance the test boots a real Nest HTTP server with `ValidationPipe`, confirms all forged staff roles return 400, and then verifies a CUSTOMER registration succeeds and is persisted.
- Both backend and frontend passed `tsc --noEmit --incremental false --pretty false` with zero errors.
- Backend unit suite: **19 files passed / 12 skipped (31 total), 62 tests passed / 21 skipped (83 total)** — all isolated DB specs remain gated on `REMEDIATION_DATABASE_URL` and are excluded from the default run.
- `git diff --check` passed. No production services, databases, credentials, or Stripe were touched.

### Remaining open items (priority-ordered, source-tractable work exhausted)

| ID | Reason not fully closeable with source edits |
|---|---|
| FIN-10 | Automated fee retention and refund requires live Stripe; cancellation is fail-closed as mitigation |
| FIN-11 | Full repriced-edit workflow requires product design and live repricing; both address and item edits are fail-closed |
| FIN-26 | Storage subscription renewal requires a cron/event source not present in the codebase |
| FIN-28 | Sequential external route services require infrastructure change (async queue / circuit breaker) |
| S26 | Operational list pagination requires schema and UI changes across many endpoints |
| S16 | Simultaneous upload/review race needs a dedicated isolated MySQL concurrent test |
| O01 | Credential rotation and token revocation are infrastructure owner actions; cannot be done via source |
| S17 | Private GCS bucket and legacy public-object migration are infrastructure actions |
| S19 | Production email delivery requires `RESEND_API_KEY` and verified sender configuration |

Production remains **unsafe to deploy** until at minimum O01 (credential rotation), S17 (private GCS), S19 (mail provider), and all Critical/High runtime-verified findings are closed.

## 2026-11-07 FIN-26 and FIN-11 continuation

- FIN-26: added four nullable columns to the `Storage` schema (`nextBillingAt`, `renewalFailedAt`, `stripeCustomerId`, `stripeDefaultPaymentMethodId`). Migration SQL in `prisma/manual-migrations/002_storage_renewal_fields.sql`. Prisma client regenerated. `StorageService.create()` now initialises `nextBillingAt = startDate + 7 days` when `autoRenew = true`. `UpdateStorageDto` accepts Stripe customer/payment-method IDs for registration after first payment. Added `processStorageRenewals` daily cron (`@Cron('0 2 * * *')`) and `chargeStorageRenewal` to `PaymentsService`: idempotent per billing day, charges off-session, advances `nextBillingAt` by 7 days on success, stamps `renewalFailedAt` without cancelling storage on failure. Five unit tests verified: success path, Stripe failure, duplicate payment guard, missing payment method guard, stable idempotency key. Live Stripe off-session charges, production schema migration, and `stripeCustomerId` population via first-booking checkout remain unverified.
- FIN-11: `updateAddresses` now has three paths: (1) address change on a PAID/CONFIRMED booking → 409 fail-closed (contact support); (2) address change on an UNPAID booking → server-side reprice via `calculateFromAddresses`, atomic `totalPrice` update with concurrent-write guard; (3) notes-only change → free, no repricing, any status. `updateItems` stays fail-closed with an improved error message. Eight regression tests verified: paid-booking block, UNPAID reprice (amount correct + calculateFromAddresses called), notes-free, inventory block, plus all pre-existing settlement guards. Both projects passed `tsc --noEmit` with zero errors. Full backend suite: 20 files passed / 13 skipped, 69 tests passed / 23 skipped. No production database, Stripe, or deployment was touched.
- Remaining open: live Stripe acceptance for FIN-26 renewals; live geocoding + browser acceptance for FIN-11 repricing; FIN-28 (checkout route timeout); FIN-10 (automated paid cancellation refund); S26 (pagination); O01/S17/S19 (external gates).
