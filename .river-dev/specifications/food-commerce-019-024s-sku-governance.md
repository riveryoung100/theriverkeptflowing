# FOOD-019–024S — Private SKU & Packaging Proposal Governance

## Actual current state

The public Southwest Harvest Bowl concept in `src/lib/food/table-catalog.ts` has `sku: null`, `packageDefinition: null`, `approvedPrice: null`, proposed ingredients, and `ordering: 'not-accepting'`. This is deliberate. FOOD-019–024R can only attach owner assertions to a real canonical SKU; a private proposed SKU must **not** be treated as an authorized catalog record.

## Delivered private workflow

- `scripts/food/food-sku-governance.ts`: strict owner-provided draft SKU and package definition, bound to the exact current canonical product/recipe/serving offer; versioned prior proposals, review references, stale-fingerprint checks and a safe blocker report.
- `scripts/food/food-sku-governance-cli.ts`: create blank history, blank proposal, append a supplied proposal, create a review template, append a private source review, inspect with optional workbench evidence. Files must stay inside `.river-dev/state` and each write uses create-new (`wx`) so earlier records survive. Realpath checks prevent traversing linked private directories.
- Tests validate serving-offer mismatches, SKU/package identity drift, invalid initial and revision numbers, archived history integrity, stale fingerprints, duplicate/forged reviews, unknown net quantity, file-path boundaries, historical preservation, and closed checkout.

`owner-reported-reviewed` is explicitly *not* independently verified label, legal, tax, or food-safety approval. This module never modifies the public catalog, never releases inventory, never assigns a selling price, never performs a Stripe request, and never enables checkout.

## Operator commands (PowerShell; run from repository root)

```powershell
node --import tsx scripts/food/food-sku-governance-cli.ts init .river-dev/state/southwest-sku-draft-v1.json
node --import tsx scripts/food/food-sku-governance-cli.ts inspect .river-dev/state/southwest-sku-draft-v1.json
node --import tsx scripts/food/food-sku-governance-cli.ts proposal-template .river-dev/state/southwest-proposal-template.json
```

A draft proposal contains **empty required values** deliberately. Do not fill or submit fabricated identifiers, weights, source references or approvals. After the owner supplies and edits a real proposal, use `inspect` for the fingerprint, then:

```powershell
node --import tsx scripts/food/food-sku-governance-cli.ts propose .river-dev/state/southwest-sku-draft-v1.json .river-dev/state/southwest-proposal-filled.json .river-dev/state/southwest-sku-draft-v2.json <exact-fingerprint>
node --import tsx scripts/food/food-sku-governance-cli.ts review-template .river-dev/state/southwest-sku-draft-v2.json food-label .river-dev/state/southwest-label-review-template.json
```

Review source entries require actual referenced evidence and remain owner assertions. If the recipe is measured and a workbench exists, `inspect <sku-draft.json> <workbench.json>` checks the measured portion mass against the proposed package net mass (but cannot independently certify either). Revisions require consecutive version numbers for the *same* SKU and package identifiers; changing a proposed SKU requires a new governance history.

## Mandatory external gates

Actual measured recipe/portion, verified ingredient sources/allergens, packaging suitability, label requirements, Texas food sale eligibility, sales-tax classification, approved product cost/price, real inventory authority, production and delivery procedures, and explicit owner launch authorization remain blocked or unverified. The existing FOOD-019–024Q evidence intake and FOOD-019–024R exact-SKU evidence history are not rewritten or promoted to public authority by S. No actual SKU is established just by completing a proposal.

## Verification

Local authoring harness: 20 focused tests pass (14 domain and 6 private file CLI); full Windows `tsx`/Astro/storefront regressions must pass in install output. Source checksums prevent assuming the code remains unchanged since the exported snapshot. Git worktree preservation is enforced; no Git commit, push, deployment or production DB action occurs.
