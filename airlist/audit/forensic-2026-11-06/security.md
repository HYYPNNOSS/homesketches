# Security and operations forensic evidence

Read-only source audit. Findings are source-confirmed unless explicitly labelled otherwise; no exploit was sent to production. Safe in-memory checks instantiated actual DTO/JwtService/TrackingGateway with mocked external dependencies. No application bootstrap, environment loading, database access or cloud requests were used.

## S01: Public registration can create ADMIN and MANAGER accounts

- Severity: Critical
- Confidence: Confirmed
- Evidence: backend_alexis/src/auth/dto/auth.dto.ts:34-41; src/auth/auth.service.ts:62-70; src/auth/auth.controller.ts:94-102
- Root cause / relevant code: The role property has only @IsString; its TypeScript union and Swagger enum do not constrain runtime values. register writes Role[dto.role].
- Trigger: Submit a normal registration body with role ADMIN. An isolated validation probe returned zero errors and Role.ADMIN. No production request was made.
- Business consequence: Unauthenticated self-elevation grants administrative access to customer records, pricing, assignments and account management.
- Recommended solution: Enforce a server-owned public role allowlist with @IsIn and a service-level guard; keep privileged account creation separate.
- Regression test: Register every privileged enum value and unknown strings; expect rejection and no user/token creation.

## S02: Unauthenticated sockets can watch bookings and forge driver GPS

- Severity: Critical
- Confidence: Confirmed
- Evidence: backend_alexis/src/tracking/tracking.gateway.ts:47-74,122-168
- Root cause / relevant code: Missing/invalid JWTs remain connected. subscribe-booking joins without ownership checks; update-location accepts driverId and bookingId without principal or assignment checks.
- Trigger: Join another booking room or send coordinates with known identifiers. Isolated actual-handler probes joined one room and performed one mocked DB update without credentials.
- Business consequence: Location privacy loss, forged dispatch/customer tracking, operational disruption and unauthenticated DB write amplification.
- Recommended solution: Reject unauthenticated connections; authorize each room and write; derive driver identity from verified user; enforce assignment and quotas.
- Regression test: Missing/invalid JWT disconnects; unrelated customer cannot join; driver cannot update another driver or booking; valid assigned driver succeeds.

## S03: Driver socket subscription reads the wrong JWT identity field

- Severity: High
- Confidence: Confirmed
- Evidence: backend_alexis/src/auth/auth.service.ts:276-277; src/tracking/tracking.gateway.ts:68-69,97-105; nglobi/app/driver/page.tsx:205-211
- Root cause / relevant code: Tokens contain sub but raw decoded claims are stored as user; handler uses user.id in a unique Prisma lookup.
- Trigger: A correctly logged-in DRIVER subscribes. user.id is undefined, so lookup fails validation instead of joining the driver room.
- Business consequence: Assignment updates are silently missed; drivers can miss dispatched or changed jobs.
- Recommended solution: Normalize verified claims to a current database principal and use sub consistently.
- Regression test: Use a real locally signed token with sub and verify the driver's own room join and assignment event delivery.

## S04: Logout/password reset do not revoke seven-day access tokens

- Severity: High
- Confidence: Confirmed
- Evidence: backend_alexis/src/auth/auth.service.ts:208-220,268-286; src/auth/strategies/jwt.strategy.ts:32-40
- Root cause / relevant code: Logout/reset delete refresh rows only. Access tokens last seven days; JWT strategy checks user existence/current role but no session version or token revocation.
- Trigger: Reuse a stolen access token after logout or password reset while the account remains present.
- Business consequence: An attacker can retain access for up to seven days after a user attempts recovery.
- Recommended solution: Use short-lived access tokens and session version/revocation checks; invalidate all required sessions on reset.
- Regression test: Authenticate, logout/reset, replay prior access token; verify policy rejects it immediately or within documented short lifetime.

## S05: Manager socket permissions survive demotion and token expiry

- Severity: High
- Confidence: Confirmed
- Evidence: backend_alexis/src/tracking/tracking.gateway.ts:64-88; src/admin/admin.service.ts:253-274
- Root cause / relevant code: Socket authentication trusts the embedded role and checks expiry only at connection; no database role refresh or room eviction exists.
- Trigger: Demoted manager reconnects using a still-valid old JWT or keeps an existing socket open after expiry.
- Business consequence: Former staff continue receiving global dispatch and location events.
- Recommended solution: Fetch current role during authorization, bind rooms to session lifetime and evict on revocation/demotion.
- Regression test: Demote a connected manager and expire token; assert subsequent subscriptions and broadcasts are denied.

## S06: Default manager password is shared and predictable

- Severity: High
- Confidence: Confirmed
- Evidence: backend_alexis/src/admin/admin.service.ts:219-242; src/admin/dto/admin.dto.ts:22-32
- Root cause / relevant code: Omitting optional password creates a manager with a fixed literal password.
- Trigger: An administrator creates a manager without specifying a password.
- Business consequence: Anyone knowing the email and code default may access global manager data and operations.
- Recommended solution: Use expiring invitation links and user-chosen passwords; never a shared fallback.
- Regression test: Create manager without password; verify no predictable login credential exists and invitation flow is mandatory.

## S07: Admin assignment bypasses booking payment, state and driver checks

- Severity: High
- Confidence: Confirmed
- Evidence: backend_alexis/src/admin/admin.controller.ts:60-64; src/admin/admin.service.ts:79-84
- Root cause / relevant code: Separate admin service unconditionally sets driverId and SCHEDULED, unlike manager service validation.
- Trigger: Assign a driver to PENDING unpaid, CANCELLED or DELIVERED booking, or assign rejected/unavailable driver.
- Business consequence: Unpaid service dispatch, resurrection of cancelled/refunded jobs, invalid scheduling and duplicated work.
- Recommended solution: Share one validated assignment transaction across admin and manager routes with explicit audited override if required.
- Regression test: Exercise admin and manager endpoints against each status, payment state and driver approval condition; expect identical invariants.

## S08: Assignment checks race with cancellation and other assignments

- Severity: High
- Confidence: Confirmed
- Evidence: backend_alexis/src/manager/manager.service.ts:263-285,321-350
- Root cause / relevant code: Reads and overlap/status checks occur before an unconditional update by id; no locking or compare-and-swap protects the decision.
- Trigger: Two requests concurrently assign the same driver to full-house jobs, or assignment resumes after another request cancels the booking.
- Business consequence: Double booking or resurrected cancelled jobs produces missed moves, refunds and reputation damage.
- Recommended solution: Lock schedule resources or serialize assignment and compare booking status/version within a transaction.
- Regression test: Barrier-controlled concurrent assignment and cancellation tests must permit only a consistent final schedule/state.

## S09: Driver availability and actual exact pickup time are not enforced by assignment

- Severity: Medium
- Confidence: Confirmed
- Evidence: backend_alexis/src/manager/manager.service.ts:287-317,340-350; src/driver/driver.service.ts:449-514
- Root cause / relevant code: Assignment checks approval only, never driverAvailability. parseSlotStart treats EXACT as NaN and falls back to 08:00; FEW_ITEMS overlaps are all accepted.
- Trigger: Assign an approved driver marked unavailable or with an EXACT appointment whose overlap is miscomputed.
- Business consequence: Dispatch schedules can exceed staff availability; route batching has no travel/capacity constraint.
- Recommended solution: Validate availability against actual exactPickupTime and a feasible route/capacity model while preserving intentional batching.
- Regression test: Unavailable day, outside shift, exact-time overlap and excessive batch capacity should be rejected or explicitly overridden.

## S10: Delivered state commits before rewards, debt and invoice transaction

- Severity: High
- Confidence: Confirmed
- Evidence: backend_alexis/src/driver/driver.service.ts:343-349,368-413
- Root cause / relevant code: Status optimistic update succeeds before downstream transaction. A failure there leaves DELIVERED and retries cannot repeat the transition.
- Trigger: Inject a DB failure while updating wallet, debt or invoice after status change.
- Business consequence: Completed jobs can lack receivables, invoices or bonuses; customer debt is permanently lost until manual repair.
- Recommended solution: Commit state and financial effects together or use durable idempotent outbox processing.
- Regression test: Fail each downstream step, retry same delivery operation, and assert exactly one complete state/ledger outcome.

## S11: Driver status endpoint bypasses DTO and accepts arbitrary financial extras

- Severity: High
- Confidence: Confirmed
- Evidence: backend_alexis/src/driver/driver.controller.ts:221-245; src/driver/driver.service.ts:322-341,378-400
- Root cause / relevant code: The route uses @Body() body:any, so DTO validation is bypassed. Extra item price, hours and packing costs have no nonnegative bounds; payment methods CARD/CASH are accepted as assertions.
- Trigger: Assigned driver sends negative hours/material prices or labels unpaid extra charges CARD, then advances an allowed status.
- Business consequence: Incorrect invoices and debt, suppressed receivables and unsupported payment records.
- Recommended solution: Use concrete validated DTOs, nonnegative bounded money/time fields, and server-verified payment state for CARD; audit cash collection.
- Regression test: Reject negative/NaN/oversized inputs and unverified card-paid assertions; allow valid approved charges only.

## S12: Delivery proof photo is discarded by the controller

- Severity: Medium
- Confidence: Confirmed
- Evidence: backend_alexis/src/driver/driver.controller.ts:226-245; src/driver/driver.service.ts:276-277,318-320
- Root cause / relevant code: Service accepts deliveryPhoto but controller never extracts or forwards it; it is swallowed by ...rest.
- Trigger: Driver submits deliveryPhoto with a status update.
- Business consequence: Proof of delivery disappears, weakening dispute evidence.
- Recommended solution: Include deliveryPhoto in the validated controller DTO and mapping; require durable authorized asset references.
- Regression test: Submit a valid delivery photo through HTTP controller and verify it survives in booking detail.

## S13: Driver undo can overwrite a concurrently completed booking

- Severity: High
- Confidence: Confirmed
- Evidence: backend_alexis/src/driver/driver.service.ts:520-539
- Root cause / relevant code: Undo reads current state then updates by id without state/version condition.
- Trigger: Undo reads UNLOADING; concurrent delivery commits DELIVERED and financial effects; undo overwrites to IN_TRANSIT.
- Business consequence: A later delivery can repeat bonuses/debt or invoice work, and delivered jobs reappear in operations.
- Recommended solution: Use conditional update matching previous state/version and transactionally manage transition side effects.
- Regression test: Synchronize undo and delivery at read/write barrier; only one transition should succeed and ledger effects remain exactly once.

## S14: Withdrawal requests can overdraw the wallet concurrently

- Severity: High
- Confidence: Confirmed
- Evidence: backend_alexis/src/users/users.service.ts:140-162; src/users/users.controller.ts:42-49
- Root cause / relevant code: Balance check precedes transaction; debit update is unconditional.
- Trigger: Two simultaneous withdrawals each pass the same balance check and both decrement.
- Business consequence: Negative balances and multiple payable withdrawal claims exceed legitimate earnings.
- Recommended solution: Use conditional wallet debit where balance>=amount inside transaction and validated integer minor units.
- Regression test: For balance 100 submit simultaneous withdrawals of 80; exactly one succeeds and balance remains 20.

## S15: Driver onboarding/approval is non-atomic and inconsistent across roles

- Severity: Medium
- Confidence: Confirmed
- Evidence: backend_alexis/src/driver/driver.service.ts:75-97; src/manager/manager.service.ts:471-490; src/admin/admin.service.ts:131-148
- Root cause / relevant code: Driver row commits before required document placeholders; role/status writes are separate. Admin approval omits document check and overwrites any user role.
- Trigger: Document creation or second role write fails; admin approves incomplete documents or changes an existing privileged/business user's role.
- Business consequence: Stuck applications, driver-status/permission divergence, and dispatch without required document checks.
- Recommended solution: Create driver/placeholders atomically; share approval rules; enforce expected prior role/state and transaction.
- Regression test: Fail each write, approve missing docs via both endpoints, and ensure no partial state or unrelated role overwrite.

## S16: Approved drivers can replace reviewed documents without reapproval

- Severity: Medium
- Confidence: Confirmed
- Evidence: backend_alexis/src/driver/driver.service.ts:123-149,163-165; src/manager/manager.service.ts:340-347
- Root cause / relevant code: Upload resets document to UPLOADED but keeps driver APPROVED; assignment checks driver status only.
- Trigger: Approved driver replaces licence/insurance after review.
- Business consequence: Driver continues to be dispatched with unreviewed evidence.
- Recommended solution: Version documents and invalidate approval or restrict assignments until required replacements are reviewed.
- Regression test: Replace an approved required document; verify assignment/approval follows the explicit re-review policy.

## S17: Public upload/download exposes private driver documents and accepts arbitrary content

- Severity: High
- Confidence: Confirmed
- Evidence: backend_alexis/src/driver/driver.controller.ts:93-131,150-181; nglobi/app/driver/apply/documents/page.tsx:109-129
- Root cause / relevant code: No guard on upload or file retrieval; no content allowlist/signature verification; upload calls makePublic and read proxy streams GCS objects for any known name.
- Trigger: Upload a private licence through normal flow then fetch its URL anonymously; attackers can also upload arbitrary content up to per-file limit.
- Business consequence: Sensitive document exposure and storage/bandwidth abuse; public proxy bypasses bucket privacy for known names.
- Recommended solution: Separate private/public stores; authenticate upload/read with ownership; content validation and quotas; short-lived authorized URLs.
- Regression test: Anonymous private document read/upload denied; cross-user reads denied; disallowed formats rejected.

## S18: GCS failure silently saves documents to ephemeral local disk

- Severity: High
- Confidence: Confirmed
- Evidence: backend_alexis/src/driver/driver.controller.ts:132-145; src/main.ts:59-65; nglobi/app/actions/upload.ts:60-73
- Root cause / relevant code: Cloud write failures become success responses with local file URLs; durable DB document references outlive instance disk.
- Trigger: GCS outage/permission failure followed by restart or requests routed to a different container.
- Business consequence: Uploaded documents/photos become unavailable and may be unrecoverable; onboarding or disputes lose evidence.
- Recommended solution: Fail upload with retryable error unless durable storage succeeds; use durable queue if offline acceptance is needed.
- Regression test: Simulate GCS failure, restart/switch instance, and ensure no successful upload response references disposable data.

## S19: Password reset never sends email and logs the reset credential

- Severity: High
- Confidence: Confirmed
- Evidence: backend_alexis/src/auth/auth.service.ts:240-250
- Root cause / relevant code: Forgot-password creates URL and writes it to console instead of sending mail.
- Trigger: Customer requests recovery; API says success but customer receives no reset link. Log readers can obtain bearer reset links.
- Business consequence: Customers cannot recover accounts; support load and abandonment; logs become an account takeover surface.
- Recommended solution: Deliver a transactional reset email, redact bearer credentials from logs, and monitor delivery.
- Regression test: Request reset: assert mocked mail delivery receives link, ordinary logs contain no token, nonexistent user response remains indistinguishable.

## S20: OAuth codes and password resets are stored only in process memory

- Severity: Medium
- Confidence: Confirmed
- Evidence: backend_alexis/src/auth/auth.service.ts:19-31,152-182,229-242,254-270
- Root cause / relevant code: Ephemeral Maps hold state required by later requests.
- Trigger: Callback on instance A, exchange/reset on B, or container restarts before redemption.
- Business consequence: Intermittent social login/recovery failures under scaling or deployment.
- Recommended solution: Use shared expiring storage with atomic single-use consume and hashed reset tokens.
- Regression test: Create on one service instance and redeem on another; replay denied; restart does not invalidate unexpired persisted request.

## S21: Refresh tokens collide within a second and rotation may reissue the same token

- Severity: High
- Confidence: Confirmed
- Evidence: backend_alexis/src/auth/auth.service.ts:186-205,276-299; prisma/schema.prisma:46-48
- Root cause / relevant code: JWT payload lacks random jti; identical subject/email/role and second produce same JWT. Stored digest has unique constraint.
- Trigger: Two logins in same second conflict on refresh row; refresh in issuance second deletes then recreates the same token. Safe JwtService probe confirmed equality for same claims/iat.
- Business consequence: Intermittent login errors and ineffective single-use rotation, especially concurrent tabs/retries.
- Recommended solution: Random unique refresh tokens/jti, transactional rotation, replay detection and defined concurrent-tab policy.
- Regression test: Two same-second logins yield different refresh tokens; redeemed token never reappears; concurrent refresh produces controlled responses.

## S22: Cookie authentication fallback is not wired into Express

- Severity: Medium
- Confidence: Confirmed
- Evidence: backend_alexis/src/auth/strategies/jwt.strategy.ts:15-17; src/auth/auth.controller.ts:127-129,147-148; src/main.ts:16-108; src/app.module.ts
- Root cause / relevant code: Cookie paths read req.cookies but no cookie-parser/middleware populates it in bootstrap/module code.
- Trigger: A client relies only on backend HttpOnly cookies rather than Bearer header/body refresh token.
- Business consequence: Authenticated requests and refresh/logout fallback fail despite existing cookies, producing inconsistent sessions.
- Recommended solution: Install and configure appropriate cookie parsing with a coherent cookie/CSRF/session design.
- Regression test: Cookie-only requests reach JWT authentication and refresh; invalid/missing cookies still fail safely.

## S23: Apple callback path differs from registered controller path

- Severity: Medium
- Confidence: Confirmed
- Evidence: backend_alexis/src/auth/strategies/apple.strategy.ts:16; src/auth/auth.controller.ts:227-233
- Root cause / relevant code: Strategy constructs /auth/apple/callback while controller exposes /auth/callback/apple.
- Trigger: Apple redirects to the callback configured by strategy.
- Business consequence: Apple sign-in cannot finish through the generated route, losing registrations.
- Recommended solution: Align strategy, controller, provider registration and frontend callback; decode verified Apple subject/email claims correctly.
- Regression test: Assert configured callback resolves to route and complete a mocked Apple callback including subsequent login with absent profile.

## S24: Personal notification socket rooms are never joined

- Severity: Medium
- Confidence: Confirmed
- Evidence: backend_alexis/src/notifications/notification.service.ts:33-36; src/tracking/tracking.gateway.ts:47-106
- Root cause / relevant code: Notification emission targets user:<id>; gateway only joins booking, managers and driver rooms.
- Trigger: Any notification is created while a user expects real-time delivery.
- Business consequence: Live notification promises fail; users miss time-sensitive approvals or status changes until refresh/poll.
- Recommended solution: Join authenticated user room during connection and remove on session expiry.
- Regression test: Connected user receives own notification; unrelated user does not; reconnection rejoins.

## S25: Admin booking responses disclose password hashes

- Severity: Medium
- Confidence: Confirmed
- Evidence: backend_alexis/src/admin/admin.service.ts:55-76,79-84
- Root cause / relevant code: Nested user:true includes password and other account fields without redaction.
- Trigger: Admin booking details or assignment endpoint serializes customer/driver/crew user objects.
- Business consequence: Credential hashes are unnecessarily exposed to browsers, extensions and logs; impact worsens with compromised admin access.
- Recommended solution: Use explicit safe projections for all related users.
- Regression test: Assert no password/provider secrets/refresh tokens in recursive admin response.

## S26: Operational lists load all bookings, documents and large proof blobs

- Severity: Medium
- Confidence: Confirmed
- Evidence: backend_alexis/src/admin/admin.service.ts:28-52; src/manager/manager.service.ts:104-110,509-515,541-558; src/driver/driver.service.ts:216-238,251-264
- Root cause / relevant code: Unbounded findMany queries include related rows and, on several paths, full booking long-text fields. No pagination or payload caps.
- Trigger: Historical orders/documents grow, while dashboards fetch lists repeatedly.
- Business consequence: Increasing latency, memory pressure, bandwidth and eventual timeouts for dispatch staff.
- Recommended solution: Paginate with stable cursors and bounded filters; explicit list projections; lazy detail/media fetch.
- Regression test: Seed large synthetic history with large signatures and verify bounded response size/query count and p95 latency.

## S27: Fleet recommendation claims random proximity and understates oversized vehicles

- Severity: Medium
- Confidence: Confirmed
- Evidence: backend_alexis/src/fleet/fleet.service.ts:15-23,85-89
- Root cause / relevant code: Math.random adds a 'nearby' bonus without location evidence; oversized loads still return one 15m³ Luton.
- Trigger: Refresh same recommendation or request a load beyond van capacity.
- Business consequence: Misleading allocation, extra trips and avoidable dispatch costs.
- Recommended solution: Use measured distance/availability and explicit multi-vehicle/no-fit results.
- Regression test: Same inputs give deterministic evidence-based scores; 20m³ load never claims one insufficient van.

## S28: Admin revenue includes unpaid and cancelled carts

- Severity: Medium
- Confidence: Confirmed
- Evidence: backend_alexis/src/admin/admin.service.ts:102-124
- Root cause / relevant code: Dashboard sums all booking.totalPrice without status/payment filters; scheduledToday also counts all dates.
- Trigger: Unpaid/cancelled carts accumulate or future scheduled jobs exist.
- Business consequence: Business reports overstate revenue and today's workload, distorting staffing/cash decisions.
- Recommended solution: Define gross bookings, cash collected, recognized revenue and today's jobs separately from authoritative ledger/status/date.
- Regression test: Seed paid, unpaid, refunded, cancelled and future orders; verify each metric against explicit business definition.

## S29: OAuth identity linking by email permits pre-account takeover and missing state binding

- Severity: Medium
- Confidence: Suspected
- Evidence: backend_alexis/src/auth/auth.service.ts:114-145; src/auth/strategies/google.strategy.ts:9-19; src/auth/strategies/facebook.strategy.ts:9-16; src/auth/auth.controller.ts:253-269
- Root cause / relevant code: OAuth finds accounts by supplied email, retains existing password, and does not enforce verified email ownership in application code. No state:true/session state store appears; supplied state is treated as redirect data.
- Trigger: Attacker preregisters another person's email with a password; victim later signs in socially and account is linked. Provider/state behavior needs isolated OAuth integration verification.
- Business consequence: Potential account takeover or login CSRF depending provider verification and browser flow.
- Recommended solution: Require verified email and authenticated account-link consent; bind OAuth state/nonce and use stable provider+subject identity.
- Regression test: Test preregistered unverified email, unverified provider email, missing/mismatched state, and callback replay with provider mocks.

## S30: Audit persistence failures are swallowed and privileged account actions lack audit trails

- Severity: Medium
- Confidence: Confirmed
- Evidence: backend_alexis/src/audit/audit.service.ts:18-31; src/admin/admin.service.ts:131-151,169-214,219-274
- Root cause / relevant code: AuditService logs errors and returns success; admin role/status methods do not call it or another durable audit mechanism.
- Trigger: Audit database write fails or a manager is created/promoted/removed.
- Business consequence: Security incidents and business disputes cannot reliably reconstruct who changed access or operations.
- Recommended solution: Durable append-only account/booking audit events transactionally recorded or delivered via outbox; monitor failure.
- Regression test: Each privileged mutation emits actor/action/before/after; injected failure cannot silently lose required event.

## Coverage and limitations

Inspected all substantive service methods and controller routes in auth, admin, manager, driver, fleet, tracking, users, notifications and audit; auth strategies/guards, public registration DTO, manager/admin/driver DTOs, relevant module wiring, main.ts, app.module.ts, Dockerfile, docker-compose.yml, vercel.json, .dockerignore and .gitignore. Auth source was read in full; other large source reads were supplemented with focused line reads to resolve output truncation. Boilerplate module/decorator files were inventory-reviewed rather than given individual behavioral tests. Prisma schema was consulted for refresh-token uniqueness only; full schema/payment review belongs to financial investigation. Existing Graphify navigation from parent context was treated only as leads.

No live tests of browser cookie rules, provider callbacks, actual deployment scaling, database isolation schedules, bucket IAM or credential validity were performed. The tracked-secret issue is covered centrally; no secret values are reproduced here. Manager access is explicitly global in source; that design is not labelled cross-tenant IDOR without a business requirement for tenant isolation. Notification REST reads/updates are scoped by authenticated user; driver flagItem checks item-booking ownership; ordinary HTTP JWT roles are read from DB, so stale HTTP role claims were not reported as a vulnerability.

Safe probe outcomes: ADMIN RegisterDto validation returned 0 errors and mapped to ADMIN; identical JWT claims and iat produced identical refresh JWT; anonymous booking subscription joined a room; unauthenticated location message reached mocked driver.update. These show handler/DTO behavior, not a claim of live exploitation.

