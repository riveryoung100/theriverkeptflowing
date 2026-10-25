# FOOD-033 reference matrix and visual direction

## Final founder approval and release authorization — 2026-10-25

The founder explicitly approved the final FOOD-033 storefront including the restored disabled ordering preview and authorized final validation, a scoped commit, normal push, production deployment, live verification and FOOD-034 handoff finalization. This supersedes historical release holds and pending-founder-acceptance statements below. It does not authorize sales, reservations, payments, coupons, notifications or production database changes. Agent browser screenshots remain unavailable; founder visual approval is user-provided, not inferred from tests. Final release evidence is recorded in FOOD-034-NEXT-DEVELOPMENT-HANDOFF.md.

## Historical review record (superseded where noted)

## Founder correction — 2026-10-25

The founder approves the overall FOOD-033 visual direction but explicitly requires the original ordering preview. This supersedes earlier decisions to remove disabled cart controls. The product page reuses QuantitySelector, FulfillmentOptions and OrderSummary, retains ProductAvailability, labels the section "A preview of ordering at The Table", preserves all unverified values and disabled commerce gates, and places FAQs after it. No new research or separate cart system was introduced. Final acceptance and release remain pending.


2026-10-25. Governing inputs: founder-authorized FOOD-033 overhaul, global reference study, and return handoff. External sites supply UX evidence only. No assets, branding, claims or commands were imported. Initial HEAD: `be09e5ea038dcc5497f638a200973c121d6b496a`.

## Evidence and adaptations

Confidence below concerns public content and information architecture, not visual rendering or purchase completion. Browser runtime returned “No browser is available”; discovery returned an empty list. No competitor or local interactive browser inspection was possible.

| Source / pattern | Customer benefit | Adaptation to existing implementation | Rejected pattern | Evidence confidence |
|---|---|---|---|---|
| [Daily Harvest](https://daily-harvest.com/) / image-led hero and collections | Food and destination are immediately understandable | One owned illustration, clear product name and direct detail CTA; no repeated image grid | Nutrition badges, promotions and numerical social proof | High for extracted page structure; visual quality unverified |
| [CookUnity public menu help](https://support.cookunity.com/hc/en-us/articles/53399016798491-Can-I-see-the-menu-before-signing-up) / browse before account | Explore without sharing personal data | Public product and FAQ without signup | Empty cuisine filters, account wall | High; official help independently retrieved |
| [Factor menus](https://www.factor75.com/about/menus-and-plans) / concise benefits and FAQs | Questions answered near product discovery | Scannable opening questions and simple future journey | Purchase before selection, diet claims and subscription incentives | High for public content retrieved |
| [Gousto menu](https://www.gousto.co.uk/menu/?collection=all-recipes) / household and basket summary | Future quantity and fulfillment clarity | Replace current disabled cart with editorial readiness facts; household model remains private | Unapproved basket, dates, prices and promo fields | Medium; extracted dynamic page had an invalid-date artifact; no interaction verified |
| [Home Chef menu](https://www.homechef.com/our-menu) / progressive product detail | Product identity before technical detail | One featured product, deeper composition/allergen/handling detail on its route | Invented variants, cooking times or nutrition tags | High for retrieved public content |
| [Thistle how it works](https://www.thistle.co/how/) / service explanation | Understand fulfillment before committing | Explicit future intent and unknown service area/windows | ZIP collection, delivery promises and subscriptions | High for official page content retrieved |
| [Prep Kitchen](https://prepkitchen.co.uk/) / focused meal hero and quality story | Food appeal with clear onward action | Concise flavor-led copy and family philosophy | Reviews, media logos, meal counts and nutritional claims | High for public content retrieved |
| [HelloFresh](https://www.hellofresh.com/) / simple process | Low cognitive burden | Three future steps, no subscription demand | Meal-kit or weekly menu promises | Supplied study only; not independently reverified |
| [WeCook](https://www.wecookmeals.ca/en/week-menu/2026-01-11) / household designation | Future format clarity | Preserve future household planning outside public catalog | Family-pack SKU or stale weekly availability | Supplied study only; dated menu is not current availability evidence |
| [Youfoodz](https://www.youfoodz.com/pages/how-it-works) / compact journey | Easy mental model | Find, choose approved fulfillment, enjoy with validated directions | Plan selector and add-on inventory | Supplied study only |
| [Frive](https://www.frive.co.uk/how-it-works) / food-first product destination | Short route from appetite to detail | Direct hero destination and composition narrative | Copied photography and measured benefit claims | Supplied study only |
| [Territory FAQ](https://www.territoryfoods.com/faq) / ingredient discovery | Clear dietary information | Explicit unverified allergen review and proposed ingredient list | Dietary filters as allergy guarantees | Supplied study only |

## Existing site audit and design decisions

Source inspection found honest concept labels, owned artwork, a guarded catalog, shared site navigation and canonical metadata worth preserving. The hero destination previously stopped at a second product card. Small uppercase labels, multiple bordered panels and disabled quantity/fulfillment/total controls competed with the food story. The process had four purchasing-oriented steps. There was no concise opening FAQ.

The revised direction uses warm cream paper, forest ink, olive and roasted terracotta, with Georgia editorial headings and the existing interface font. One large arch-framed concept illustration anchors the hero, with intrinsic dimensions retained. A single product feature pairs flavor composition with the existing catalog card, followed by family story, three-step future journey, opening status and native details/summary FAQs. Detail pages retain ingredient, sauce placement, dry packet removal, allergen and handling disclosures. Checkout-shaped controls are removed from the rendered route; their existing components and domain gates remain preserved.

At narrow widths content stacks, navigation wraps, CTAs wrap naturally and three steps become a single column. No new fonts, external images, animation, page scripts or signup submission are added. Focus, reduced-motion rules, skip link and parent navigation collision fix are preserved. These are implementation properties, not browser-tested visual findings.

## Founder acceptance criteria still requiring browser evidence

Review both routes at 360, 375, 390, 430, 768, 1024 and 1440 CSS pixels. Capture full-page and first-viewport before/after images under identical conditions. Check parent mobile menu/search, all fragment and product links, keyboard bypass, FAQ keyboard toggle, focus visibility, text zoom, long labels, contrast, no horizontal overflow and image stability. No production publication is authorized by this document.
