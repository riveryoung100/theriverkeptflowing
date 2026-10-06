# Private food runtime configuration and activation runbook

## Status and authority

FOOD-001H is inert planning/documentation only. This runbook grants no operational authorization. Its [specification](../../.river-dev/specifications/food-001h-private-food-runtime-configuration-activation-runbook-boundary.json) records separate future approval gates. No configuration, provisioning, migration, identity lookup, secret creation, route/UI or deployment occurs in this slice.

[FOOD-001C](../../.river-dev/specifications/food-001c-d1-append-only-food-draft-repository-migration-boundary.json) remains schema/persistence authority; [FOOD-001F](../../.river-dev/specifications/food-001f-trusted-environment-private-food-draft-runtime-acquisition-boundary.json) validates food environment keys; [FOOD-001G](../../.river-dev/specifications/food-001g-injected-trusted-server-context-private-food-draft-adapter.json) constructs the trusted server-context adapter. FOOD-001A-G source remains unchanged. Configuration never grants sale authority or bypasses principal/session authorization.

## Future dedicated database contract

The intended binding is `RIVER_FOOD_DB`, using `migrations/food` and the existing [migration](../../migrations/food/0001_food_draft_snapshots.sql). Use a dedicated food database; never reuse commerce, CRM, insurance, Sesh or identity databases.

Database name, Cloudflare account, environment, location and assigned database ID are **undecided**. A future approved Wrangler entry contains `binding: "RIVER_FOOD_DB"`, the selected dedicated `database_name`, the verified assigned `database_id` and `migrations_dir: "migrations/food"`. No placeholder ID belongs in active configuration. Preserve all existing unrelated declarations and migration-directory conventions.

After separately approved actual binding declaration, regenerate Cloudflare typing through the normal Wrangler type-generation workflow. FOOD-001F/G structural typing remains valid until then. Do not edit/regenerate typing or active Wrangler configuration in FOOD-001H.

## Future administrator configuration

`RIVER_FOOD_ADMIN_PRINCIPAL_ID` is the intended environment-specific key. Recommend a Wrangler secret/environment-secret mechanism for the concrete production value rather than committing it to Git. The PrincipalId is privileged configuration, not an authentication credential; secrecy does not replace session/principal authorization. No concrete principal ID is known or approved here.

A separately authorized identity-verification step must use the existing authenticated principal/session system, resolve the intended administrator through canonical identity records, verify that principal is active in the intended environment, and capture the exact canonical PrincipalId. Do not derive it from display name, email/name guesses, River OS access keys, Sesh identities, test fixtures, food IDs or login success alone.

## Separately authorized phases

Each phase requires explicit authorization. Completion of one phase never authorizes the next.

| Phase | Work and gate |
|---|---|
| A: Target selection | Choose account, environment, dedicated database name and location. Define local/dev isolation and backup/recovery policy. |
| B: Provisioning | Create the dedicated database; capture and verify its assigned ID. Do not apply migrations yet. |
| C: Repository declaration | Add verified food binding/migration directory and regenerate environment typing. Validate configuration before any deployment. |
| D: Migration | Inspect target and inventory. Apply the existing food migration only to the explicitly approved target. Verify tables, exact composite foreign keys, both UPDATE and DELETE rejection triggers, and recorded migration state afterward. |
| E: Administrator | Verify the intended active canonical principal and configure the key for that exact environment. |
| F: Private route/UI | Separately design and approve the first River OS private food route/UI. Infrastructure activation does not imply route activation. |

Deployment remains a separate explicitly approved operation; configuration declaration does not authorize it.

## Local/dev isolation and remote execution gates

Future local/dev verification requires separate nonproduction configuration, a dedicated local persistence/state directory, synthetic/nonproduction identities where practical, and explicit local target verification before applying migrations. Never allow default project configuration to direct tests/dev work to remote production resources. Existing isolated FOOD-001C tests remain separate from project database operations.

Immediately before any remote migration, verify the correct Cloudflare account, exact configuration/environment, exact binding/name/ID, migration inventory and backup/recovery plan. Obtain explicit user approval immediately before execution. Identity verification and secret configuration also require their own authorization; never substitute a development identity for the production administrator.

## Future manual command examples

These are **future manual approval steps only; do not execute them as part of FOOD-001H**. Angle-bracket arguments denote unresolved selections, not usable configuration. Replace them only after the relevant phase is approved. Named-environment flags apply only when that environment has been explicitly configured.

Phase B, dedicated remote database creation without automatic configuration edits:

```powershell
npx wrangler d1 create <selected-food-database-name> --config <approved-config-path> --update-config=false
```

Phase C, generated typing after verified binding declaration:

```powershell
npx wrangler types worker-configuration.d.ts --config <approved-config-path>
```

Phase D, separately approved local migration with isolated configuration/state:

```powershell
npx wrangler d1 migrations apply RIVER_FOOD_DB --local --config <isolated-nonproduction-config> --persist-to <dedicated-local-state-directory>
```

Phase D, separately approved remote migration after target verification and immediate user approval:

```powershell
npx wrangler d1 migrations apply RIVER_FOOD_DB --remote --config <verified-target-config>
```

If an approved target uses a named environment, append `--env <verified-environment>` consistently. Inspect the migration inventory and verify that the configuration selects only `migrations/food` for the food binding. The migration already exists; do not generate a duplicate. Its current harness-only scope does not authorize configured-database application; phase D must explicitly authorize that transition.

Phase E, environment-specific secret configuration after canonical identity verification:

```powershell
npx wrangler secret put RIVER_FOOD_ADMIN_PRINCIPAL_ID --config <verified-target-config>
```

Provide the approved value through the secret prompt rather than embedding it in command examples or Git. Verify account/environment for provisioning and secret configuration as well as migration. These examples contain no real IDs or secrets and do not prescribe deployment.

## Recovery and residual verification

Database changes are durable outside Git. Reverting code or configuration does not undo an applied migration. Append-only triggers intentionally restrict ordinary repair; prefer disabling access and separately reviewed forward corrective migrations over destructive rollback. Destructive rollback is outside FOOD-001H.

Establish and verify a recovery policy before remote activation. Keep local/dev and production recovery targets separate. Local Miniflare evidence from FOOD-001C does not prove production consistency, replication or transport-failure behavior; those require separately authorized verification.

## Deferred scope

Defer database provisioning, active Wrangler bindings, generated typing changes, migration execution, administrator lookup, secret creation, routes/actions/UI, public food products, checkout/Stripe/commerce, fulfillment/accounting/community/public counters, deployment and production data. Do not create `.dev.vars` or `.dev.vars.example`, modify FOOD-001A-G source, or change unrelated insurance/Sesh/creator systems.
