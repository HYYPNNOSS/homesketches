# Financial, booking, pricing and data integrity investigation

Read-only source investigation; all service probes used in-memory mock dependencies. No DB, Stripe, live API, environment or production mutation was performed.

## Coverage

Read the payment service/controller/state helper; booking service/controller, state machine and expiry; pricing service/controller, packing-price and DTOs; invoice service/controller; storage service/controller/DTO; promo service/controller; users service/controller (withdrawal findings owned by security investigator); quote service; Prisma models and relations relevant to these domains. Module wiring and duplicate DTO files were inventoried. Source portions of manager cancellation and auth registration were cross-checked and referred to security investigator. Schema migrations directory is absent in the checked Prisma tree. This does not prove actual deployed schema parity. No production billing reconciliation, migration, storage job, backups or restore exercise was performed.

## Safe reproduction results

A single inline Node process loaded source through ts-node/transpile-only and constructed services with Object.create and mocked Prisma/Stripe fields (constructors and Nest application were never booted). Findings FIN-02, FIN-03, FIN-04, FIN-06, FIN-13 were demonstrated: balance 20000p instead of 16000p; null-deposit snapshot 20000p; extra-time returned normal pending secret; webhook retry skipped failed confirmation; invalid FULL_HOUSE items produced no validation errors. Remaining findings are static control/data-flow confirmations or explicitly labeled uncertainty.

## FIN-01: Customer can mark an invoice paid without paying

- Severity: **Critical**. Confidence: **Confirmed**.
- Evidence: `backend_alexis/src/invoices/invoices.controller.ts:18-23; src/invoices/invoices.service.ts:28-40` (paths beginning `nglobi/` are in the frontend repository).
- Root cause: The BUSINESS customer route directly sets InvoiceStatus.PAID after ownership lookup; no processor, ledger, or settlement verification occurs.
- Trigger: A business user calls POST /invoices/:id/pay on their unpaid invoice.
- Business consequence: Receivables disappear without collecting money and fulfillment may proceed against false paid records.
- Recommended solution: Replace customer status mutation with a processor checkout; settle from verified payment events. Keep separately authorized offline settlement with evidence and actor audit.
- Regression test: Customer pay request must not mark PAID until a matching successful payment is verified.

## FIN-02: Balance payment charges total again after deposit

- Severity: **High**. Confidence: **Confirmed**.
- Evidence: `backend_alexis/src/payments/payments.service.ts:58-93; src/payments/payment-state.util.ts:35-42` (paths beginning `nglobi/` are in the frontend repository).
- Root cause: Payment state computes amountDue but createIntent only uses the state; amount is booking.totalPrice.
- Trigger: For a £200 booking with £40 SUCCEEDED deposit, request a non-deposit intent. An isolated mock probe produced 20000 pence instead of 16000.
- Business consequence: Overcharging, disputes, refunds, and customer distrust.
- Recommended solution: Derive chargeable remaining principal from successful principal payments and reserve that amount atomically.
- Regression test: £200 booking minus £40 paid must produce exactly £160; repeated requests must reuse one purpose/amount intent.

## FIN-03: Advertised deposit is charged as full total

- Severity: **High**. Confidence: **Confirmed**.
- Evidence: `backend_alexis/src/bookings/bookings.service.ts:166-169; src/payments/payments.service.ts:89-93; nglobi/app/app/page.tsx:2649-2699; nglobi/app/app/book/page.tsx:1126-1169; nglobi/components/nglob-missing-1-5.tsx:214-216` (paths beginning `nglobi/` are in the frontend repository).
- Root cause: Frontend creation omits payDeposit, so depositAmount is null. Payment isDeposit then falls back to the full total while checkout displays £40.
- Trigger: Select deposit on a newly created booking. Mock service probe for null depositAmount charged 20000 pence on £200.
- Business consequence: Customer pays much more than displayed and deposit/balance bookkeeping is missing.
- Recommended solution: Establish deposit plan server-side from payment purpose; use configured deposit capped at order total and return exact payable amount to UI.
- Regression test: Fresh deposit journey must show and charge the same configured amount and persist remainder.

## FIN-04: Extra time and principal intents collide; paid principal blocks extra-time settlement

- Severity: **High**. Confidence: **Confirmed**.
- Evidence: `backend_alexis/src/payments/payments.service.ts:58-85,89-99` (paths beginning `nglobi/` are in the frontend repository).
- Root cause: Pending lookup matches isDeposit but ignores isExtraTime and amount. PAID principal rejects before inspecting extra-time purpose.
- Trigger: Request extra time while a normal non-deposit intent is pending, or after principal is paid. Mock returned the existing principal client secret for extra time.
- Business consequence: Wrong charge purpose/amount; legitimate extra-time debt cannot be collected after full payment.
- Recommended solution: Separate principal/deposit/extra-time purposes; validate debt status and amount independently.
- Regression test: Paid principal plus £20 extra-time debt must allow exactly £20; normal intent cannot be reused for extra time.

## FIN-05: Concurrent intent creation has no effective idempotency

- Severity: **High**. Confidence: **Confirmed**.
- Evidence: `backend_alexis/src/payments/payments.service.ts:49-138; prisma/schema.prisma:319-339` (paths beginning `nglobi/` are in the frontend repository).
- Root cause: Read pending payment, create Stripe intent, then insert DB row are separate operations; no Stripe idempotency key or unique active purpose constraint.
- Trigger: Two requests read no pending intent before either inserts; both obtain distinct payable intents. A DB insert failure also leaves an orphan external intent.
- Business consequence: Duplicate charges and unreconciled processor objects.
- Recommended solution: Use stable Stripe idempotency keys and a database reservation keyed by booking/purpose/version; reconcile orphan outcomes.
- Regression test: Race two calls behind a barrier and assert one external intent and one active reservation.

## FIN-06: Webhook commits payment success before fulfillment and skips failed work on retry

- Severity: **High**. Confidence: **Confirmed**.
- Evidence: `backend_alexis/src/payments/payments.service.ts:265-307; src/bookings/bookings.service.ts:642-688` (paths beginning `nglobi/` are in the frontend repository).
- Root cause: Payment SUCCEEDED is persisted before booking, reward, and storage effects. A retry sees SUCCEEDED and returns; booking confirmation similarly returns once status moved.
- Trigger: Inject a DB/service failure after payment update. Mock retry made only one confirmation attempt and left state SUCCEEDED.
- Business consequence: Paid customers can remain unconfirmed or lose rewards; payment retries do not repair partial state.
- Recommended solution: Transactional ledger and state updates plus durable outbox with independently idempotent side effects.
- Regression test: Inject failure at every post-payment boundary and replay webhook; all required effects eventually occur once.

## FIN-07: Failed then successful payment remains locally FAILED

- Severity: **High**. Confidence: **Confirmed**.
- Evidence: `backend_alexis/src/payments/payments.service.ts:250-259,265-298` (paths beginning `nglobi/` are in the frontend repository).
- Root cause: Failure handler changes PENDING to FAILED, but success handler only promotes PENDING and ignores update count before confirming booking.
- Trigger: The same intent fails a card attempt and later succeeds on retry.
- Business consequence: Processor collected funds while dashboards say unpaid; duplicate payment prompts and bad accounting.
- Recommended solution: Allow a verified success to advance eligible failed attempts, reconcile event ordering, and check mutation result.
- Regression test: Deliver failed then succeeded events for the same intent and assert SUCCEEDED ledger and correct amountDue.

## FIN-08: Cancellation can leave a paid charge with a cancelled job

- Severity: **High**. Confidence: **Confirmed**.
- Evidence: `backend_alexis/src/payments/payments.service.ts:49-65,120-125; src/bookings/booking-expiry.service.ts:24-38; src/bookings/bookings.service.ts:642-646` (paths beginning `nglobi/` are in the frontend repository).
- Root cause: Intent creation does not restrict cancelled booking status; expiry does not cancel pending Stripe intents. Confirmation updates only PENDING bookings.
- Trigger: Customer completes a pending intent after two-hour expiry or cancellation, or creates an intent for a cancelled booking.
- Business consequence: Money collected with no fulfillment and no automatic refund path for that outcome.
- Recommended solution: Invalidate or cancel processor intents on cancellation; reconcile late success and refund or route to explicit review.
- Regression test: Cancel/expire while checkout is open, then deliver success; verify controlled outcome and no stranded money.

## FIN-09: Refund failures are swallowed after irreversible cancellation state

- Severity: **High**. Confidence: **Confirmed**.
- Evidence: `backend_alexis/src/payments/payments.service.ts:178-195; src/manager/manager.service.ts:161-174` (paths beginning `nglobi/` are in the frontend repository).
- Root cause: Refund errors only log, manager cancellation succeeds and tells customer payment will be refunded. A successful processor refund followed by failed DB update also leaves SUCCEEDED locally.
- Trigger: Processor outage or DB failure during refund; retry cancellation is rejected by state machine.
- Business consequence: Unreturned funds, chargebacks, ledger discrepancies, manual support workload.
- Recommended solution: Persist refund requests and states with idempotency and retry worker; return truthful pending status; reconcile processor events.
- Regression test: Inject refund failure and post-refund DB failure; retries eventually produce one refund and matching ledger.

## FIN-10: Customer cancellation has no financial settlement; reschedule fees are only returned

- Severity: **High**. Confidence: **Confirmed**.
- Evidence: `backend_alexis/src/bookings/bookings.service.ts:410-457,461-496` (paths beginning `nglobi/` are in the frontend repository).
- Root cause: Cancellation computes fee but only sets status; no refund or fee payment. Reschedule fee is computed and audited but not added to payable balance.
- Trigger: Cancel a prepaid job or repeatedly reschedule within the fee window.
- Business consequence: Unsettled refunds and lost rescheduling revenue; discrepancy between quoted terms and collected charges.
- Recommended solution: Implement explicit cancellation/refund policy and fee ledger, with idempotent settlement rather than return-only numbers.
- Regression test: Prepaid cancellation reconciles retained fee/refund; close-date reschedule adds one correct fee.

## FIN-11: Address and inventory edits bypass repricing

- Severity: **High**. Confidence: **Confirmed**.
- Evidence: `backend_alexis/src/bookings/bookings.service.ts:500-605` (paths beginning `nglobi/` are in the frontend repository).
- Root cause: Edit endpoints change addresses/items and optionally add a fixed fee without recalculating route, volume, duration, staffing, or base price.
- Trigger: Book a cheap short move then change to a distant destination or much larger inventory before fulfillment.
- Business consequence: Systematic undercharging and impossible fleet schedules.
- Recommended solution: Recompute quote from authoritative data, expire prior payment intents, update capacity allocation and collect delta with customer approval.
- Regression test: Changing 1 km to 100 km or increasing inventory must change pricing/duration and invalidate stale intent.

## FIN-12: Client coordinates control authoritative route price

- Severity: **High**. Confidence: **Confirmed**.
- Evidence: `backend_alexis/src/pricing/pricing.service.ts:378-408; src/bookings/bookings.service.ts:89-95; src/bookings/dto/create-booking.dto.ts:83-86` (paths beginning `nglobi/` are in the frontend repository).
- Root cause: Truthy supplied coordinates are trusted instead of deriving or checking them against addresses.
- Trigger: Submit distant addresses with nearby coordinates, which OSRM routes as a short job.
- Business consequence: Underpriced fuel/time and incorrect pickup tracking.
- Recommended solution: Resolve authoritative coordinates server-side or verify signed server-issued geocode/quote data.
- Regression test: Tampered coordinates inconsistent with addresses must be rejected or ignored.

## FIN-13: FULL_HOUSE bypasses all item validation

- Severity: **High**. Confidence: **Confirmed**.
- Evidence: `backend_alexis/src/bookings/dto/create-booking.dto.ts:114-120; src/bookings/bookings.service.ts:99-102,236-248; src/pricing/pricing.service.ts:441-449` (paths beginning `nglobi/` are in the frontend repository).
- Root cause: ValidateIf disables array and nested validation for FULL_HOUSE, but service always maps items and pricing uses any nonempty items ahead of home size.
- Trigger: Omit items to trigger TypeError, or send a minimal/invalid item list with FULL_HOUSE to override loading time. Mock validator accepted negative item dimensions without errors.
- Business consequence: Checkout 500s, corrupt inventory, and lower loading charges for full-house jobs.
- Recommended solution: Always validate supplied arrays; require consistent type-specific fields and choose pricing mode explicitly from booking type.
- Regression test: FULL_HOUSE omitted/invalid items handled safely; tiny supplied item cannot override full-house loading floor.

## FIN-14: Storage delivery can reference another customer’s goods

- Severity: **High**. Confidence: **Confirmed**.
- Evidence: `backend_alexis/src/storage/storage.service.ts:77-105; prisma/schema.prisma:307-315` (paths beginning `nglobi/` are in the frontend repository).
- Root cause: Ownership checks apply to the storage record but each supplied storageItemId is inserted without checking it belongs to that storage. Foreign key only proves existence.
- Trigger: Owner of storage A supplies a known item ID from storage B.
- Business consequence: Cross-customer delivery records and potential release of another customer’s goods if operations trust these records.
- Recommended solution: Fetch all requested items with storageId=current storage and reject any mismatch before transaction.
- Regression test: Foreign item ID must return forbidden/not found and create no delivery.

## FIN-15: Storage deliveries are scheduled before collecting their charge

- Severity: **High**. Confidence: **Confirmed**.
- Evidence: `backend_alexis/src/storage/storage.service.ts:85-109; prisma/schema.prisma:289-302; src/payments/payments.service.ts:302-306` (paths beginning `nglobi/` are in the frontend repository).
- Root cause: Delivery creation defaults status SCHEDULED even when cost=25; payment success merely writes the same state.
- Trigger: Create a second delivery and abandon checkout.
- Business consequence: Operations may fulfill a chargeable delivery without payment.
- Recommended solution: Introduce awaiting-payment state and only schedule after verified settlement; explicitly handle free entitlement.
- Regression test: Unpaid £25 delivery must be excluded from dispatch and only become scheduled after payment.

## FIN-16: Concurrent first storage deliveries both become free

- Severity: **Medium**. Confidence: **Confirmed**.
- Evidence: `backend_alexis/src/storage/storage.service.ts:85-109` (paths beginning `nglobi/` are in the frontend repository).
- Root cause: Count previous deliveries then create is not atomic and does not reserve the free entitlement.
- Trigger: Two requests for a new storage both count zero before either creates.
- Business consequence: Multiple free deliveries and duplicate dispatch.
- Recommended solution: Transactional one-time entitlement reservation and request idempotency.
- Regression test: Concurrent first deliveries must yield one free delivery and one charged or duplicate-rejected request.

## FIN-17: Promo limits can be exceeded by multiple unpaid bookings

- Severity: **High**. Confidence: **Confirmed**.
- Evidence: `backend_alexis/src/promo/promo.service.ts:63-78,105-117; src/bookings/bookings.service.ts:134-156,685-688; prisma/schema.prisma:384-397` (paths beginning `nglobi/` are in the frontend repository).
- Root cause: Promo eligibility is checked at booking creation but usage is recorded only after payment; uses/count writes are not transactional and have no per-user uniqueness.
- Trigger: Create multiple discounted pending bookings before paying any, then pay all. Also concurrent users can exceed maxUses.
- Business consequence: Unbounded discounts beyond intended campaign limits; corrupted counters after partial write.
- Recommended solution: Reserve redemption atomically with uniqueness and expiry; enforce campaign cap and per-user policy on settlement.
- Regression test: Multiple pending bookings and concurrent last-use requests cannot exceed entitlement; retry does not increment twice.

## FIN-18: Referral reward can be replayed through paid then cancelled first bookings

- Severity: **High**. Confidence: **Confirmed**.
- Evidence: `backend_alexis/src/bookings/bookings.service.ts:650-669; src/manager/manager.service.ts:161-174; src/payments/payments.service.ts:178-195` (paths beginning `nglobi/` are in the frontend repository).
- Root cause: First-order eligibility ignores CANCELLED bookings and no immutable rewarded-customer constraint or reward reversal exists.
- Trigger: Pay first referred booking, cancel/refund, then pay another. No previous non-pending/non-cancelled booking remains, so referrer is credited again.
- Business consequence: Referral wallet farming and payout losses, especially with coordinated accounts.
- Recommended solution: Unique reward per referred customer tied to settled non-refunded outcome; reversal ledger on refund and abuse controls.
- Regression test: Paid→refunded→new booking cannot mint another first-customer reward; wallet reconciles refund policy.

## FIN-19: Customer booking updates race fulfillment and retain conflicting assignment

- Severity: **Medium**. Confidence: **Confirmed**.
- Evidence: `backend_alexis/src/bookings/bookings.service.ts:410-443,461-477,500-523,551-585` (paths beginning `nglobi/` are in the frontend repository).
- Root cause: Statuses checked in reads are not part of update predicates; reschedule keeps driver/crew without checking new slot availability.
- Trigger: Driver advances status between customer read and update; or customer moves an assigned booking to an occupied date.
- Business consequence: Cancelled in-progress work, edits after loading, or double-booked drivers.
- Recommended solution: Compare-and-swap status/version and revalidate driver/crew capacity in the same transaction as reschedule.
- Regression test: Race customer cancel/edit with driver transition; reschedule onto overlapping assignment must reject or reassign.

## FIN-20: Booking plus linked storage and invoice state are not atomic

- Severity: **Medium**. Confidence: **Confirmed**.
- Evidence: `backend_alexis/src/bookings/bookings.service.ts:176-279,282-318,696-725` (paths beginning `nglobi/` are in the frontend repository).
- Root cause: Booking commits before audit/storage creation; invoice commits before booking status change.
- Trigger: Storage/audit failure after booking persists yields HTTP error; retry creates duplicate booking. Invoice update failure leaves invoice with pending booking.
- Business consequence: Duplicate orders and missing linked storage; partially confirmed credit orders.
- Recommended solution: Wrap related database writes in one transaction and dispatch audit/notifications through outbox; add creation idempotency.
- Regression test: Fail each boundary and retry; exactly one complete business aggregate must exist.

## FIN-21: Pricing preview does not apply authenticated promo eligibility

- Severity: **Medium**. Confidence: **Confirmed**.
- Evidence: `backend_alexis/src/pricing/pricing.controller.ts:150-157; src/promo/promo.controller.ts:24-31; src/bookings/bookings.service.ts:136` (paths beginning `nglobi/` are in the frontend repository).
- Root cause: Public pricing/promo handlers read req.user but no optional authentication guard populates it; strict eligibility happens later in booking service.
- Trigger: Returning customer submits Bearer token and a first-order/referral or already-used code.
- Business consequence: Preview advertises discount then booking fails or price changes at checkout.
- Recommended solution: Use optional JWT authentication and one shared promo validation policy for preview and booking.
- Regression test: Authenticated returning user sees identical eligibility and price at preview and booking.

## FIN-22: Storage duration price differs between quote and booking

- Severity: **Medium**. Confidence: **Confirmed**.
- Evidence: `backend_alexis/src/pricing/pricing.service.ts:515-528; src/bookings/bookings.service.ts:80-84` (paths beginning `nglobi/` are in the frontend repository).
- Root cause: Preview prorates storageDays when weeks absent, but booking enforces ceil(days/7) weeks.
- Trigger: Request storageDays=1 without storageWeeks.
- Business consequence: Checkout quote and charged amount diverge, causing disputes or abandonment.
- Recommended solution: Normalize duration once in shared pricing policy before both preview and booking.
- Regression test: One-day and eight-day storage produce identical preview and persisted totals.

## FIN-23: Date and integer validation does not match database/business constraints

- Severity: **Medium**. Confidence: **Confirmed**.
- Evidence: `backend_alexis/src/bookings/dto/create-booking.dto.ts:57-69,88-98,153-196; src/bookings/dto/update-booking.dto.ts:29-35; src/storage/dto/storage.dto.ts:23-29` (paths beginning `nglobi/` are in the frontend repository).
- Root cause: IsDateString allows past dates; IsNumber admits fractional integer columns; returnDate/returnTimeSlot have weak validators and update dimensions allow negative values.
- Trigger: Fractional movers/item quantities or invalid return date/slot pass validation then fail Prisma; past jobs and invalid inventory can persist where schema accepts.
- Business consequence: Avoidable 500s, unusable jobs, and corrupted measurements.
- Recommended solution: Use IsInt, sensible bounds, enum and date validators with service-level future/scheduling rules and typed DB writes.
- Regression test: Boundary tests cover fractions, negative dimensions, malformed returns, past dates, and DST.

## FIN-24: Saved quote expiry is stored but not enforced

- Severity: **Medium**. Confidence: **Confirmed**.
- Evidence: `backend_alexis/src/quotes/quote.service.ts:15-17,30-46` (paths beginning `nglobi/` are in the frontend repository).
- Root cause: getDrafts/getDraft do not filter expiresAt and no cleanup scheduler exists in inspected src.
- Trigger: Resume a quote after its 14-day expiry.
- Business consequence: Stale quotes remain actionable/displayed and storage grows indefinitely; users may rely on expired expectations.
- Recommended solution: Enforce expiry consistently and archive/delete with a documented retention policy.
- Regression test: Expired quote must be absent or explicitly expired while active quote loads.

## FIN-25: Referral dashboard tiers disagree with paid reward policy

- Severity: **Medium**. Confidence: **Confirmed**.
- Evidence: `backend_alexis/src/users/users.service.ts:108-126; src/bookings/bookings.service.ts:653-662` (paths beginning `nglobi/` are in the frontend repository).
- Root cause: Dashboard counts any booking and hardcodes tier thresholds/rewards; settlement counts nonpending/noncancelled bookings and uses settings.
- Trigger: Referral creates abandoned cart or configured tiers differ.
- Business consequence: Misleading earnings expectations and support disputes.
- Recommended solution: Share paid-referral eligibility and configured tier calculation with payout logic.
- Regression test: Unpaid/cancelled referrals do not count; custom tier settings display same reward as settlement.

## FIN-26: Storage subscription renewal and inventory ingestion are absent from runtime source

- Severity: **Medium**. Confidence: **Suspected**.
- Evidence: `backend_alexis/src/storage/storage.service.ts:20-40,112-134; prisma/schema.prisma:245-285; src/bookings/booking-expiry.service.ts:21` (paths beginning `nglobi/` are in the frontend repository).
- Root cause: Storage advertises subscription/autoRenew and stores paymentMethodId, but src search found no subscriptions API, storage billing cron, or storageItem create/update path.
- Trigger: Keep storage active beyond prepaid period or attempt to list stored inventory.
- Business consequence: Potential ongoing warehouse service without recurring revenue or usable item return workflow; an external/manual process may exist.
- Recommended solution: Confirm intended operations and external jobs; implement durable billing/inventory lifecycle if absent.
- Regression test: Sandbox end-to-end storage lifecycle across renewal, failed payment, inventory intake and return.

## FIN-27: Monetary ledger persists binary floats

- Severity: **Medium**. Confidence: **Suspected**.
- Evidence: `backend_alexis/prisma/schema.prisma:134-144,319-329,342-348,505-510,649-653` (paths beginning `nglobi/` are in the frontend repository).
- Root cause: Booking/payment/wallet amounts use Float, while payment state sums floats and compares amountPaid >= totalPrice without rounding before comparison.
- Trigger: Many fractional transactions accumulate representation errors near paid threshold.
- Business consequence: Incorrect penny balances or PAID state; actual affected inputs require numerical fixtures/runtime data.
- Recommended solution: Persist integer minor units or fixed Decimal and compare canonical minor units.
- Regression test: Property tests on many fractional payments/refunds and threshold equality.

## FIN-28: External route services are sequential dependencies for checkout

- Severity: **Medium**. Confidence: **Requires Runtime Verification**.
- Evidence: `backend_alexis/src/pricing/pricing.service.ts:72-108,388-408` (paths beginning `nglobi/` are in the frontend repository).
- Root cause: Each missing coordinate is geocoded sequentially and then route fetched; each can take eight seconds; no cache in this path.
- Trigger: Geocoder or public route service throttles or times out under concurrent booking traffic.
- Business consequence: Long checkout latency and failed conversion; operational service policy/capacity not verified.
- Recommended solution: Use cached provider-backed routes with bounded concurrency, observability and explicit unavailable behavior.
- Regression test: Inject timeout/429 and measure bounded latency and user recovery without invalid fallback pricing.

