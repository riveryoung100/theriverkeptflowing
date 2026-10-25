# FOOD-033 private hospitality planning

SPEC ONLY. Runtime implementation DEFERRED to keep this mission focused on storefront acceptance. No public offer, coupon, entitlement, distribution, customer collection, redemption endpoint or payment integration exists in this slice. All future tests use synthetic household references and clocks only.

## Three distinct events

1. **First family meal invitation:** founder manually approves a household invitation and its explicit household-size and meal-count caps. Eligible first order once, contingent on lawful, verified sales. Not a cash credit or transferable code.
2. **First paid return visit:** a separately approved complimentary add-on with that first paid return, after costs and eligible dishes are verified. Not an automatic reward for merely receiving an invitation.
3. **Second paid return visit:** a separately approved targeted courtesy at the second paid return, conditional on verified economics. No ambiguous “second/third visit” wording and no automatic entitlement.

Each event needs its own eligibility, terms, expiry, benefit definition, evidence and founder authorization. No current SKU, meal quantity, price, courtesy dish or expiry duration is invented here.

## Proposed private records and boundaries

Campaign record: type `FIRST_FAMILY_MEAL_INVITATION`, revision, owner approval reference, issue policy, household eligibility definition, maximum households, maximum meals per household, total exposure cap, eligibility scope, nontransferability, terms version and explicit expiry. Unknown caps block issuance; null never means unlimited.

Invitation record: cryptographically random opaque identifier with at least 256 bits of entropy; store a digest rather than a bearer value. Synthetic household reference, campaign revision, founder approval, eligibility snapshot, household size, capped meal count, issue/expiry instants and state. Do not encode names, email, employer, sequential household IDs or eligibility in the token. Never log raw tokens.

States: `DRAFT`, `ISSUED`, `REDEEMED`, `VOID`, `EXPIRED`. Only DRAFT to ISSUED with complete manual approval, current terms, verified lawful sales/cost gates and available capped exposure. DRAFT or ISSUED may become VOID. ISSUED becomes EXPIRED at expiry or REDEEMED atomically against one eligible first order and exact household/campaign scope. No terminal-state revival. State names here describe future synthetic simulations only.

Redemption must be a conditional atomic operation with a uniqueness constraint on invitation and eligible household/campaign first-order scope; idempotency retries return the same result. Concurrent competing orders cannot both win. No partial public reservation service is part of FOOD-033. Successful synthetic redemption records order reference, approved benefit version, count, prior state, event ID, actor, timestamp and provenance. Corrections append audit events rather than rewriting history.

Only personal opt-in relationships and founder-authorized channels are eligible for future invitations. Employer or other-company leads are excluded. Any future contact data needs a separate consent and retention policy; this specification collects none. Explain conditions plainly, with no manufactured exclusivity, pressure or undisclosed costs.

## Economics and evidence

Record food cost, packaging, labor, delivery cost, recipient/household counts, paid-return contribution margin, maximum authorized exposure and observed repeat rate only from evidence with units, scope, date, source and reviewer. All are currently **unknown**. Unknown cost blocks an approved exposure calculation. Intended free pickup/delivery is not zero operating cost. Benefit caps must include the first invitation plus both return courtesies and their incremental fulfillment cost.

Proposed calculations after evidence: invitation exposure = sum of approved meal counts times evidenced incremental unit costs plus incremental fulfillment; return contribution = evidenced collected revenue less incremental food, packaging, labor, delivery and courtesy costs. Repeat rate needs a defined eligible cohort, observation window and paid-return event count; no assumed percentage or invented target. Monetary math uses existing integer-cent domain conventions, checked overflow and exact currency matching.

## Required synthetic test plan before any runtime implementation

| Boundary | Required tests |
|---|---|
| Issue approval | Missing founder approval, terms, lawful-sale evidence, cost evidence or cap rejects; replay cannot issue twice |
| Identity | Opaque secure randomness, digest-only persistence, no token/PII logs, malformed and guessed tokens rejected |
| Household | Zero, fractional, excessive and changed household sizes reject; nontransferability and eligible first-order rule enforced |
| Exposure | Per-household and campaign caps, concurrent issuance, unknown costs, currency mismatch and integer overflow |
| Lifecycle | Every allowed and forbidden transition, exact expiry boundary with injected clock, no terminal revival |
| Redemption | Single use, concurrent double attempt, duplicate event idempotency, cross-campaign/order/household mismatch |
| Returns | First paid return and second paid return counted separately; unpaid/cancelled/refunded events follow explicit approved policy; no double courtesy |
| Audit | Actor, approval, terms revision and source provenance required; append-only correction chain |
| Isolation | No imports from public routes, no generated coupon schema/UI, no real messages, Stripe calls, customer data or production database access |

Future implementation needs a separately bounded specification and evidence review. Founder acceptance of the visual storefront does not approve this campaign for issue or redemption.
