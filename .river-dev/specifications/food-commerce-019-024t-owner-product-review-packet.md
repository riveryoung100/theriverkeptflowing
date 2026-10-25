# FOOD-COMMERCE-019–024T: owner product source-evidence review packet

This adds a **read-only, fail-closed, local review packet** over the existing measured recipe workbench (P/Q), exact-SKU inventory and price evidence history (R), and proposed SKU/package revision chain (S). The first Southwest Harvest Bowl concept still has no canonical approved exact SKU, no approved retail price, and no independent regulatory/food-safety permission.

## Private commands

```
node --import tsx scripts/food/food-owner-review-packet-cli.ts inspect .river-dev/state/sku-v1.json
node --import tsx scripts/food/food-owner-review-packet-cli.ts inspect .river-dev/state/sku-v2.json .river-dev/state/recipe-workbench.json .river-dev/state/inventory-review.json
node --import tsx scripts/food/food-owner-review-packet-cli.ts write .river-dev/state/sku-v2.json .river-dev/state/recipe-workbench.json .river-dev/state/inventory-review.json .river-dev/state/new-packet.json
```

Use `-` for an unavailable optional workbench or inventory history. Supply **only actual existing paths**. An output packet is write-once within `.river-dev/state`. No command edits original evidence, the public catalog, production inventory, payment records, Stripe or the production database.

## Source authority

- A package/SKU proposal cannot establish a canonical SKU.
- Source assertions do not count as independently reviewed allergens, safety, legality, tax classification, labeling, fulfillment or price.
- Receipt and ingredient-cost arithmetic cannot establish profit when actual expenses are missing.
- A physical count is never automatically sellable capacity.
- Draft source revisions must match the actual product/recipe/serving offer.
- An owner review packet is a **diagnostic**, never permission to transact.

The packet reports source fingerprints, owner inputs, missing review categories, recipe mass/portion completeness, package weight conflicts, exact-SKU and price gating, and prioritized actions. Tests include forgery, stale product, missing SKU, write-once persistence and path-boundary rules. All production actions remain disabled.
