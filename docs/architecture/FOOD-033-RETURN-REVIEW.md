# FOOD-033 founder review pack

## Final founder approval and release authorization — 2026-10-25

The founder explicitly approved the final FOOD-033 storefront including the restored disabled ordering preview and authorized final validation, a scoped commit, normal push, production deployment, live verification and FOOD-034 handoff finalization. This supersedes historical release holds and pending-founder-acceptance statements below. It does not authorize sales, reservations, payments, coupons, notifications or production database changes. Agent browser screenshots remain unavailable; founder visual approval is user-provided, not inferred from tests. Final release evidence is recorded in FOOD-034-NEXT-DEVELOPMENT-HANDOFF.md.

## Historical review record (superseded where noted)

## Founder ordering-preview correction — 2026-10-25

Final correction validation: FOOD **4,286/4,286 PASS** (zero skips, 212.96 seconds); storefront **9/9 PASS**; Stripe operator **11/11 PASS**; full check **PASS** (zero errors/warnings, 11 existing hints). Corrected local preview: http://127.0.0.1:4339/the-table/ and http://127.0.0.1:4339/the-table/southwest-harvest-bowl/ . Both return HTTP 200; restored preview heading, owned illustration and linked CSS verified. These are local HTTP/output checks, not final visual acceptance. Founder final acceptance PENDING; no commit/push/deployment.


This update supersedes earlier statements approving removal of the ordering preview. The founder approves the overall visual direction and requires the original ordering experience to remain. The subsequent clarification explicitly holds commit, push and deployment until final acceptance of this correction.

The product page reuses unchanged QuantitySelector, FulfillmentOptions, OrderSummary and ProductAvailability components and existing domain logic. The section is titled "A preview of ordering at The Table"; quantity, fulfillment radios/window and checkout remain disabled. Prices, portions, fees, limits, capacity and availability remain unconfirmed. No order, payment, reservation or coupon is created. Readiness disclosures remain below the controls; all six FAQs follow the ordering preview. The FOOD-033 landing, imagery, story and navigation remain intact.

Release scope remains the existing 13 paths. Local recovery reports and validation logs are excluded. Current correction validation and preview details are recorded in `.river-dev/food-033-restoration-status.md`. Earlier test results below describe earlier source, not this correction. Final founder acceptance is PENDING; no release operation is authorized by the earlier visual-direction approval.


2026-10-25. **PARTIAL: implemented locally; browser visual acceptance remains outstanding.** Production publication is not authorized. Checkout, payments, preorders and coupon redemption remain unavailable.

## Authoritative continuation results

The interrupted implementation was recovered intact on the same branch/HEAD. No original source, ignored evidence or browser profile was deleted. The results below in the original validation section describe the interrupted run; this continuation supersedes its deferred Stripe investigation and expands the proposed source scope as listed here.

Browser retry again returned `No browser is available`; recovery documentation was followed and `agent.browsers.list()` returned `[]`. No new controlled screenshots exist, no visual acceptance is claimed, and no rendered UI defects were established or fixed. All seven widths, mobile navigation, focus, FAQ interaction, text zoom and rendered overflow remain pending under the [manual review procedure](FOOD-033-MANUAL-VISUAL-REVIEW.md). Founder approval remains PENDING.

The Stripe regression was a demonstrably stale test expectation: the untouched historical operator checks exact Git identity before the no-session branch. Only `scripts/food/stripe-testmode-operator.test.mjs` changed to derive the configured identity, compare the operator's actual repository identity, and require STOP at an unauthorized HEAD (or deferral only when authorized). It additionally requires no Session/PaymentIntent retrieval, no local storage and no payment/order authorization. No Git guard, credential handling, payment safeguard or synthetic/live boundary changed. The affected file passed **11/11 tests**.

Fresh `npm run check` passed (ESLint, Astro: zero errors, zero warnings, 11 existing hints, production build and Pagefind: 168 indexed pages). Fresh generated-output checks passed **9/9**, covering privacy/security presentation, owned SVG safety, closed commerce, accessible source references, route/canonical links and sitemap membership. These assertions do not prove rendered interaction or visual accessibility. Byte comparison across **2,923 source files** in the preserved source-only validation directory found **zero mismatches**. `git diff --check` passed.

Full FOOD regression: **4,286/4,286 passed**, zero failures/cancellations/skips, 223.37 seconds. This includes private diagnostics isolation, provider boundary/contract, credential non-disclosure and synthetic/live separation tests. The first sandbox attempt failed during loader initialization with `uv_os_get_passwd` ENOMEM; the approved retry used the unchanged real tests outside that restriction. No loader shim, skipped tests or modified environment identity was used.

Fresh logs are preserved in `C:/Users/river/AppData/Local/Temp/food-033-source-review-20261025/`: `food-033-resume-check.log`, `food-033-resume-regressions.log` (sandbox failure), `food-033-resume-regressions-approved.log`, `food-033-resume-storefront-output.log`; copies are also preserved under the same names in ignored `.river-dev/`. Isolated operator results are in `.river-dev/food-033-resume-operator.log`; HTTP results are in `.river-dev/food-033-resume-http.json`; the exact source/document hash inventory is `.river-dev/food-033-resume-preservation.json`. The static-only preview was restarted from the fresh build at port 4339; both revised routes and the illustration returned HTTP 200. These are local diagnostics, excluded from commit scope.

Proposed exact release scope is the original ten paths below plus `scripts/food/stripe-testmode-operator.test.mjs`, `docs/architecture/FOOD-033-MANUAL-VISUAL-REVIEW.md` and `docs/architecture/FOOD-034-NEXT-DEVELOPMENT-HANDOFF.md`: **13 paths total**. The new test corrects historical Git identity expectations; the new documents preserve acceptance and next-phase boundaries. No local commit, push or deployment was made. No current production fetch was needed or performed during this continuation; the earlier live-site observation remains historical evidence only.

Next exact action: open the local static preview and complete the seven-width screenshot/interaction checklist, then obtain explicit founder approval of the visual result and precise release scope. [FOOD-034 handoff](FOOD-034-NEXT-DEVELOPMENT-HANDOFF.md) is ready for the next engineering phase; hospitality remains private SPEC ONLY.

## Review the result

Local static preview: http://127.0.0.1:4339/the-table/ and http://127.0.0.1:4339/the-table/southwest-harvest-bowl/ . Both pages and the owned illustration returned HTTP 200. This server serves built files on loopback only; it cannot execute commerce APIs. It runs from the temporary review directory below and lasts only while its process remains running. To recreate the preview later, use the existing `node scripts/food/preview.mjs` development command from the repository (port 4335).

### Before and after evidence

Historical FOOD-032G screenshots remain preserved in `.river-dev/food-032g-browser-evidence/`: `home-{375,390,768,1024,1440}-{initial,full}.png` and equivalent `detail-*` files, with original `results.json`. The historical 390px landing full-page image was inspected during FOOD-033. These screenshots predate the present task; they are not fresh captures of HEAD and must not be represented as a controlled before/after set. Their JSON includes viewport/document-width discrepancies, so they cannot establish the requested width coverage for this overhaul.

**New before screenshots: none. New after screenshots: none.** Browser setup returned “No browser is available”; troubleshooting discovery returned `[]`. The [Browser skill](C:/Users/river/.codex/plugins/cache/openai-bundled/browser/26.818.41509/skills/control-in-app-browser/SKILL.md) directs: “If the requested backend remains unavailable, report that plainly instead of controlling it through an unrelated browser tool or source-code workaround.” No alternative browser controller was used. Source inspection, HTML assertions and HTTP requests are not visual QA.

## What changed and why

| Area | Previous source | FOOD-033 result |
|---|---|---|
| Hero | Illustration plus headline, CTA to another landing section | Owned arch-framed illustration, immediate bowl name, direct product destination and honest development state |
| Product feature | Product card beside dense operational panel | One product card paired with concise ingredient-led editorial composition |
| Story | Brief family statement | Dedicated family-owned philosophy grounded in grandmother-style hospitality; no credentials or evidence invented |
| Future journey | Four purchase-oriented steps | Three future-intent steps with explicit operational/legal caveats |
| Detail route | Disabled quantity, fulfillment selector and order summary | Editorial readiness section, no cart-shaped controls; ingredient and safety disclosures retained |
| Questions | No dedicated FAQ | Six native keyboard-operable details/summary questions on both routes |
| Structure | Separate local navigation markup | Shared Table navigation alongside unchanged parent navigation |
| Imagery | Owned concept SVG and future photo support | Same SVG, explicit concept label, dimensions preserved; existing local owned-photo union remains the future photo slot |

No catalog IDs, recipe versions, domain logic, API handlers, migrations, environment files, parent layout/navigation, dependencies, rule configuration or private FOOD-031 history changed. Canonical recipe history retains earlier intent; the existing `SOUTHWEST_PRELAUNCH_DESIGN` presentation supplies current planned components, inside sauce positioning and removable dry pepita packet. No new SKU, price, reviews, nutrition, availability or promotions were created. Six planning departments and the one active Southwest experiment remain intact.

### Explicit source path list

- `src/pages/the-table/index.astro`
- `src/pages/the-table/[slug].astro`
- `src/styles/table-launch.css`
- `src/components/table/ProductImage.astro`
- `src/components/table/TableNavigation.astro` (new)
- `src/components/table/OpeningQuestions.astro` (new)
- `scripts/food/storefront-output.test.ts`
- `docs/architecture/FOOD-033-UX-REFERENCE-MATRIX.md` (new)
- `docs/architecture/FOOD-033-HOSPITALITY-PRIVATE-SPEC.md` (new)
- `docs/architecture/FOOD-033-RETURN-REVIEW.md` (new)

Only these paths are candidates for a later reviewed commit. Screenshots, temporary source copies, logs, profiles, local databases and generated build output are not source candidates.

## Validation conditions

Per the return handoff, validation uses a source-only copy at `C:/Users/river/AppData/Local/Temp/food-033-source-review-20261025`, populated from tracked source plus the two new Astro components. It reuses the installed dependencies through a directory junction. Byte comparison of all 2,923 copied source files against the working tree returned zero mismatches. No original ignored evidence was removed or edited.

`npm run check` passed: full ESLint, Astro check (zero errors, zero warnings; 11 existing deprecation hints), Astro production build and Pagefind (168 indexed pages). Initial sandboxed Wrangler log writes reported EPERM although the command passed; the final full run used a writable temporary log directory and passed without those log errors. An initial test attempt failed before execution because Windows `os.userInfo()` returned ENOMEM inside the sandbox; the approved retry uses the same source and real tests outside that restriction, with test concurrency 2.

Generated-output suite: **9 passed**, including route links, canonical descriptions, sitemap membership, one featured product, one illustration per page, native FAQ presence, ingredient consistency, missing cart affordances, privacy, no Offer/Product/ratings schema, no invented prices/nutrition, and closed commercial presentation. Existing cart-specific assertions were replaced to enforce the authorized removal of those controls; all other safety and accessibility checks remain.

Source-based checks retain focus rules, reduced motion, skip links, labelled-by references, unique IDs, one H1, image alt/dimensions and shared header collision fix. Mathematical contrast spot checks: body 10.97:1, muted copy 6.09:1, eyebrow 6.03:1, terracotta composition 5.83:1, illustration caption 7.23:1, inverse body 8.78:1, olive heading 4.78:1. These do not measure every rendered state or substitute for browser accessibility review.

Full FOOD regression command: `node --import tsx --test --test-concurrency=2 "src/lib/food/**/*.test.ts" "scripts/food/*.test.ts" "scripts/food/*.test.mjs"`. Result: **4,286 tests; 4,285 passed; 1 failed; none skipped**, in 214.9 seconds. The one failure is `noninteractive missing Session defers without network or prompts` in `scripts/food/stripe-testmode-operator.test.mjs`: expected exit 0, got exit 1. The unchanged operator wrapper pins branch/HEAD to historical commit `99af8686f1564372875409b6ca4fe52144f68dbe`; at the current published HEAD it correctly takes its STOP path before the missing-session deferred path. The test and wrapper match their HEAD versions. An isolated rerun reproduced the same failure. This baseline inconsistency remains deferred; changing a historical payment-operator gate is outside the storefront overhaul. No guard or assertion was weakened to obtain green results.

Preserved local logs (ignored, not commit candidates): `.river-dev/food-033-check-final.log`, `.river-dev/food-033-regressions.log`, `.river-dev/food-033-storefront-output.log`, `.river-dev/food-033-baseline-operator-failure.log`, plus `.river-dev/food-033-regressions-sandbox-attempt.log` for the initial environment failure. `git diff --check` passed. All seven executable/source candidates match the tested copy; the three new planning/review Markdown files are documentation only.

## Publication and preservation

Previous and current HEAD: `be09e5ea038dcc5497f638a200973c121d6b496a`; branch `cif-001-canonical-content-source-record`. No commit or push during this acceptance iteration. Repository CI contains validation on main pushes and main-targeted PRs, with no deploy step, but external Cloudflare/GitHub deployment-hook behavior has not been verified. Therefore no remote push was attempted. No deployment, Stripe operation, production database access, migration, customer-data write, signup, coupon distribution or notification occurred.

A read-only direct HTTPS check returned 200, previous “Real food.” hero present, new “A place at” headline absent, and “Payments and preorders remain unavailable.” present. This confirms the previous storefront remained live at verification time; it is not a byte-for-byte production release audit.

Hospitality is **SPEC ONLY**, runtime DEFERRED. The private specification covers the three-event journey, manual approval, opaque tokens, household/exposure caps, lifecycle, expiry, atomic single-use redemption, consent boundaries, audit provenance, unknown economics and required synthetic tests. It introduces no public route or runtime import.

## Founder acceptance checklist

- Inspect both revised routes at 360/375/390/430/768/1024/1440 CSS pixels and capture new comparable screenshots.
- Judge food appeal, composition, type, whitespace, first-viewport clarity and family-story voice.
- Verify parent mobile menu/search, Table links, detail link and fragment targets.
- Keyboard-test skip link, visible focus, native FAQ opening/closing and text zoom.
- Confirm no clipping or horizontal scroll; inspect long labels, image stability and all rendered contrast states.
- Confirm inside sauce, separately sealed dry packet removed before microwaving, proposed ingredients and unresolved safety details read clearly.
- Review the explicit source list and retain publication as a separate founder decision after visual acceptance.

**Next single action:** complete browser visual acceptance of the local storefront, including the seven-width screenshot set. Do not publish from this report alone.
