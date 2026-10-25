# FOOD-019–024Q — private measured food evidence intake

This additive slice continues the verified FOOD-019–024P-R1 work without replacing recipe or commerce engines. It provides a **write-once local JSON operator workflow** for entering actual kitchen measurement and cost evidence into the *existing* draft formulation/costing/workbench modules. It does not independently verify a human-entered supplier reference or permit commercial approval.

The private CLI accepts only files within `.river-dev/state`, writes to a new destination (`wx`), and never changes the source workbench file. Each command includes the exact recipe ID, version and fingerprint; stale input fails rather than silently changing the original formulation.

Supported capture types: ingredient mass with scale evidence reference; exact ingredient supplier/cross-contact/recall review assertion; fully measured yield/portion/method with a prototype capture ID; verified receipt cost tied to an exact measured ingredient and supplier; and one new operating expense with explicit cost knowledge and source. Unknowns are not converted into zero, and changed costing after an existing record requires a new recipe revision. All resulting draft records remain unapproved.

Operator commands after installation:

```
node --import tsx scripts/food/operating-system.ts init-workbench .river-dev/state/first-workbench.json
node --import tsx scripts/food/food-evidence-intake-cli.ts template .river-dev/state/first-workbench.json ingredient-measurement .river-dev/state/mass-0-command.json 0
# Edit template locally to add actual grams and actual measurement source reference, then:
node --import tsx scripts/food/food-evidence-intake-cli.ts apply .river-dev/state/first-workbench.json .river-dev/state/mass-0-command.json .river-dev/state/first-workbench-m1.json
node --import tsx scripts/food/operating-system.ts workbench .river-dev/state/first-workbench-m1.json
```

The real menu preview remains non-purchasable. These steps do not constitute food-handler, safety, labeling, pricing, tax, or legal approval. They do not create inventory, production food, orders, Stripe payments, or production D1 records. Later stages must integrate approved recipes/labels/physical inventory, local fulfillment, and separate owner approvals; the entire FOOD-019–024 project remains incomplete commercially.
