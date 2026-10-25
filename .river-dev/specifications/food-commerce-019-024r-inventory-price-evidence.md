# FOOD-019–024R — Private exact-SKU count, price and compliance evidence

This is an additive private owner-recorded evidence-history workflow, **not** a stock authority, price approval, regulatory determination, or commercial launch authorization.

Source files:

- `scripts/food/food-inventory-price-evidence.ts` reuses the canonical exact-SKU physical-count and commercial-price validators. A count cannot become sellable inventory without an independently validated recorded-balance read-point, freshness verification, production release, and authorization. A supplied price approval assertion cannot replace the canonical catalog's independently governed approval.
- `scripts/food/food-inventory-price-evidence-cli.ts` keeps evidence inside `.river-dev/state/*.json`. `init` creates an unverified template; `append` creates a *new* history file, guarded by the original fingerprint. No existing file is overwritten. `inspect` shows the blockers without exposing customer data.

Commands, from repo root:

```powershell
node --import tsx scripts/food/food-inventory-price-evidence-cli.ts init .river-dev/state/southwest-sku-evidence-v1.json
node --import tsx scripts/food/food-inventory-price-evidence-cli.ts inspect .river-dev/state/southwest-sku-evidence-v1.json
```

The Southwest Harvest Bowl remains a **concept** with no authoritative SKU, approved price, physical stock, or food/label/tax clearance. Source review statements are human assertions only and do not convey eligibility, no matter how the owner labels them.

This module does not change checkout, app public pages, payment processing, existing physical inventory services, production D1, or launches. Full project integration and operation require owner-supplied actual records and a canonical SKU lifecycle; all gaps remain blocked.
