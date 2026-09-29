# INS-002F6B — Telnyx Production Rollout Runbook

## Purpose

This runbook defines the controlled production activation path for the landed Telnyx V2 webhook ingress.

It does not authorize or perform deployment, Cloudflare runtime-variable creation, Telnyx webhook registration, live D1 mutation, or live calls.

## Landed application contract

Public endpoint:

`/api/insurance/telnyx-webhook`

Required runtime resources:

- `RIVER_CRM_DB`
- `TELNYX_WEBHOOK_PUBLIC_KEY`

`TELNYX_WEBHOOK_PUBLIC_KEY` must contain the Base64-encoded raw 32-byte Ed25519 public signing key for the intended Telnyx account.

The account-specific key value must not be committed to Git.

## Request pipeline

The deployed webhook path must preserve this order:

1. Read the exact request body as raw text.
2. Read `telnyx-signature-ed25519`.
3. Read `telnyx-timestamp`.
4. Verify the Telnyx Ed25519 signature against the exact raw body.
5. Reject failed authentication before JSON parsing or D1 application.
6. Parse and normalize the authenticated Telnyx V2 `data` envelope.
7. Acknowledge supported or intentionally ignored permanent outcomes.
8. Return non-2xx for retryable transient outcomes.
9. Let the landed correlated-event and receipt layers own reconciliation and deduplication.

## Expected HTTP behavior

| Condition | Expected status |
| --- | ---: |
| Missing or invalid Telnyx signature | 401 |
| Stale Telnyx signature timestamp | 401 |
| Authenticated unsupported event | 204 |
| Authenticated invalid JSON | 400 |
| Authenticated malformed recognized event | 400 |
| Accepted or ignored canonical application result | 204 |
| Retryable transient canonical application result | 503 |
| Missing runtime database or signing-key configuration | 503 |
| Unexpected infrastructure failure | 503 |

## Production rollout order

1. Confirm the approved Git revision, branch, and clean working tree.
2. Confirm `RIVER_CRM_DB` still points to the intended production CRM D1 database.
3. Obtain the V2 webhook signing public key from the intended Telnyx account.
4. Configure `TELNYX_WEBHOOK_PUBLIC_KEY` in the Worker production runtime.
5. Re-run the focused F1–F5 tests.
6. Run the production build.
7. Deploy the exact approved revision.
8. Verify the HTTPS endpoint exists.
9. Send only a harmless unsigned probe and confirm it is rejected before application/D1 processing.
10. Confirm no unexpected application or database mutation resulted from that unsigned probe.
11. Register the deployed HTTPS endpoint as the Telnyx V2 voice webhook destination.
12. Perform one controlled provider-originated lifecycle validation.
13. Confirm correlation resolves the expected attempt and call leg.
14. Confirm bridge reconciliation preserves landed state-machine semantics.
15. Confirm canonical attempt reconciliation preserves landed semantics.
16. Confirm event receipt deduplication handles redelivery safely.

## Production endpoint

Expected path:

`/api/insurance/telnyx-webhook`

The final fully-qualified production URL must be derived from the actual deployed domain at rollout time. Do not hard-code an assumed domain into provider configuration without verifying the live deployment.

## Rollback boundaries

If runtime configuration fails before deployment:

- do not deploy.

If deployment fails validation before Telnyx registration:

- do not register the webhook.

If Telnyx registration has occurred but provider delivery is unhealthy:

- remove or replace the webhook destination before additional live testing.

If the deployment introduces unrelated application regressions:

- restore the last known-good deployed application revision.

Do not use rollback as an opportunity to alter D1 schema, reconciliation semantics, event identity, correlation identity, bridge state transitions, or receipt ownership.

## Explicitly out of scope for this runbook-authoring slice

- setting `TELNYX_WEBHOOK_PUBLIC_KEY`
- changing `wrangler.jsonc`
- regenerating Worker runtime types
- deploying the Worker
- querying or mutating production D1
- executing migrations
- calling the Telnyx API
- registering a Telnyx webhook
- placing a live phone call
- changing production resources
