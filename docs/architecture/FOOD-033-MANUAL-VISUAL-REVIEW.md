# FOOD-033 manual visual acceptance

## Final founder approval and release authorization — 2026-10-25

The founder explicitly approved the final FOOD-033 storefront including the restored disabled ordering preview and authorized final validation, a scoped commit, normal push, production deployment, live verification and FOOD-034 handoff finalization. This supersedes historical release holds and pending-founder-acceptance statements below. It does not authorize sales, reservations, payments, coupons, notifications or production database changes. Agent browser screenshots remain unavailable; founder visual approval is user-provided, not inferred from tests. Final release evidence is recorded in FOOD-034-NEXT-DEVELOPMENT-HANDOFF.md.

## Historical review record (superseded where noted)

## Founder correction acceptance — 2026-10-25

Overall visual direction approved; final acceptance of restored ordering preview PENDING. Commit, push and deployment remain on hold by explicit founder clarification. Inspect "A preview of ordering at The Table" on the product route: quantity plus/minus/input, pickup/delivery choices, window and order summary must be visible but disabled, with unknown amounts/capacity unconfirmed and no reservation or order possible. ProductAvailability remains; FAQs must follow the preview. Include this section in the responsive, keyboard, zoom and overflow checks below. Earlier screenshots and tests cannot establish visual acceptance of this correction.


2026-10-25. Founder approval PENDING. Automated browser retry returned `No browser is available`; documented recovery discovery returned `[]`. No new screenshots were captured. No rendered UI defect has been established or fixed in this continuation.

## Run the local review

From the repository, run `node scripts/food/preview.mjs` and leave that terminal running. Open http://127.0.0.1:4335/the-table/ and http://127.0.0.1:4335/the-table/southwest-harvest-bowl/ in your browser. This is a local preview, not a deployment. Do not submit forms or invoke APIs. For a static-only review, run the already preserved `food-033-static-preview.mjs` from the source-validation directory described in the return review; it serves `dist/client` at port 4339 and accepts only GET/HEAD.

Use browser developer tools responsive mode with device emulation disabled, CSS width as below, height 900, zoom 100%, and device pixel ratio 1. Wait for fonts/images to settle. Record browser/version, date, route, viewport, zoom, source HEAD and current dirty source inventory. Save a first-viewport and full-page screenshot for each route/width: 28 captures total. Use `home-360-initial.png`, `home-360-full.png`, `detail-360-initial.png`, etc. Keep evidence in the ignored `.river-dev/food-032g-browser-evidence/food-033-resume/` subdirectory without altering historical files. Historical FOOD-032G captures are reference only, not a controlled before set.

| CSS width | Home | Detail |
|---|---|---|
| 360 | Pending | Pending |
| 375 | Pending | Pending |
| 390 | Pending | Pending |
| 430 | Pending | Pending |
| 768 | Pending | Pending |
| 1024 | Pending | Pending |
| 1440 | Pending | Pending |

For every cell record pass/fail and screenshot names. Inspect the whole page: no horizontal scroll, clipped text, header collisions, crowded navigation, stretched illustration, overlapping content or inconsistent spacing. In the developer console, `({viewport: innerWidth, document: document.documentElement.scrollWidth})` should show document width no greater than viewport width. This measurement supplements visual inspection.

At 390 and 1440, use only Tab/Shift+Tab/Enter/Space: reach and activate the skip link, see each focus indicator, follow Table links and product links, open/close all six FAQs, and test the parent mobile menu/search where applicable. Verify menu expanded state, escape/close behavior and focus recovery. Check all visible links and fragment targets on both routes, including the parent navigation; record failures and destination status. Source/output link checks do not establish interactive acceptance.

At 375 and 1024, repeat at 200% text size using the browser's text-only zoom if supported; otherwise record the limitation and test 200% page zoom. At 1440 also test 400% page zoom/reflow. Record effective CSS viewport and check readable copy, controls, focus, menu and FAQ without horizontal reading scroll.

Confirm the first viewport identifies Southwest Harvest Bowl and development status. Illustration must read as concept art, not a product photo. Check no price, sale offer, checkout, reservation, coupon or invented nutrition is presented. Sauce is inside; the separately sealed dry pepita packet is removed before microwaving; final recipe, allergens, packaging, reheating and availability remain unverified. Evaluate food appeal, typography, contrast in every interactive state, family-story voice and whitespace.

Record defects with route, width, steps, expected/actual result and screenshot. Fix only verified defects, rerun affected checks, and recapture the changed states. Founder must explicitly approve the resulting visual evidence and precise release scope before any push or deployment. Completing this checklist does not authorize commerce activation or hospitality issuance.
