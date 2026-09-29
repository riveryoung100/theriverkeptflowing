import assert from "node:assert/strict";
import test from "node:test";

import {
    DEFAULT_TELNYX_WEBHOOK_MAXIMUM_TIMESTAMP_SKEW_SECONDS,
    TELNYX_WEBHOOK_SIGNATURE_HEADER,
    TELNYX_WEBHOOK_TIMESTAMP_HEADER,
    verifyTelnyxWebhookSignature
} from "./telnyx-webhook-signature";

const NOW_SECONDS =
    1_800_000_000;

const NOW_MS =
    NOW_SECONDS * 1000;

async function createKeyPair(): Promise<CryptoKeyPair> {
    const pair =
        await globalThis.crypto.subtle.generateKey(
            {
                name: "Ed25519"
            },
            true,
            [
                "sign",
                "verify"
            ]
        );

    return pair as CryptoKeyPair;
}

function toBase64(
    bytes: ArrayBuffer
): string {
    const view =
        new Uint8Array(bytes);

    let binary =
        "";

    for(const byte of view){
        binary +=
            String.fromCharCode(byte);
    }

    return globalThis.btoa(binary);
}

async function sign(
    privateKey: CryptoKey,
    timestamp: string,
    rawBody: string
): Promise<string> {
    const bytes =
        new TextEncoder().encode(
            `${timestamp}|${rawBody}`
        );

    const signature =
        await globalThis.crypto.subtle.sign(
            {
                name: "Ed25519"
            },
            privateKey,
            bytes
        );

    return toBase64(signature);
}

test(
    "exports the canonical Telnyx webhook header names and five-minute default replay window",
    () => {
        assert.equal(
            TELNYX_WEBHOOK_SIGNATURE_HEADER,
            "telnyx-signature-ed25519"
        );

        assert.equal(
            TELNYX_WEBHOOK_TIMESTAMP_HEADER,
            "telnyx-timestamp"
        );

        assert.equal(
            DEFAULT_TELNYX_WEBHOOK_MAXIMUM_TIMESTAMP_SKEW_SECONDS,
            300
        );
    }
);

test(
    "verifies a valid signature over the exact timestamp pipe raw-body material",
    async () => {
        const keys =
            await createKeyPair();

        const timestamp =
            String(NOW_SECONDS);

        const rawBody =
            '{"data":{"event_type":"call.answered"}}';

        const signature =
            await sign(
                keys.privateKey,
                timestamp,
                rawBody
            );

        const result =
            await verifyTelnyxWebhookSignature({
                rawBody,
                signature,
                timestamp,
                publicKey:
                    keys.publicKey,
                nowMs:
                    NOW_MS
            });

        assert.deepEqual(
            result,
            {
                verified: true,
                timestampSeconds:
                    NOW_SECONDS,
                ageSeconds:
                    0
            }
        );
    }
);

test(
    "raw body bytes are authoritative and transformed JSON text does not verify",
    async () => {
        const keys =
            await createKeyPair();

        const timestamp =
            String(NOW_SECONDS);

        const original =
            '{ "data": { "event_type": "call.answered" } }';

        const transformed =
            '{"data":{"event_type":"call.answered"}}';

        const signature =
            await sign(
                keys.privateKey,
                timestamp,
                original
            );

        const result =
            await verifyTelnyxWebhookSignature({
                rawBody:
                    transformed,
                signature,
                timestamp,
                publicKey:
                    keys.publicKey,
                nowMs:
                    NOW_MS
            });

        assert.deepEqual(
            result,
            {
                verified: false,
                reason:
                    "invalid-signature"
            }
        );
    }
);

test(
    "tampered body fails signature verification",
    async () => {
        const keys =
            await createKeyPair();

        const timestamp =
            String(NOW_SECONDS);

        const signature =
            await sign(
                keys.privateKey,
                timestamp,
                '{"ok":true}'
            );

        const result =
            await verifyTelnyxWebhookSignature({
                rawBody:
                    '{"ok":false}',
                signature,
                timestamp,
                publicKey:
                    keys.publicKey,
                nowMs:
                    NOW_MS
            });

        assert.deepEqual(
            result,
            {
                verified: false,
                reason:
                    "invalid-signature"
            }
        );
    }
);

test(
    "signature from another key fails verification",
    async () => {
        const trusted =
            await createKeyPair();

        const untrusted =
            await createKeyPair();

        const timestamp =
            String(NOW_SECONDS);

        const rawBody =
            '{"data":"example"}';

        const signature =
            await sign(
                untrusted.privateKey,
                timestamp,
                rawBody
            );

        const result =
            await verifyTelnyxWebhookSignature({
                rawBody,
                signature,
                timestamp,
                publicKey:
                    trusted.publicKey,
                nowMs:
                    NOW_MS
            });

        assert.deepEqual(
            result,
            {
                verified: false,
                reason:
                    "invalid-signature"
            }
        );
    }
);

test(
    "missing signature is rejected before cryptographic verification",
    async () => {
        const keys =
            await createKeyPair();

        const result =
            await verifyTelnyxWebhookSignature({
                rawBody:
                    "{}",
                signature:
                    null,
                timestamp:
                    String(NOW_SECONDS),
                publicKey:
                    keys.publicKey,
                nowMs:
                    NOW_MS
            });

        assert.deepEqual(
            result,
            {
                verified: false,
                reason:
                    "missing-signature"
            }
        );
    }
);

test(
    "missing timestamp is rejected before cryptographic verification",
    async () => {
        const keys =
            await createKeyPair();

        const result =
            await verifyTelnyxWebhookSignature({
                rawBody:
                    "{}",
                signature:
                    "AAAA",
                timestamp:
                    undefined,
                publicKey:
                    keys.publicKey,
                nowMs:
                    NOW_MS
            });

        assert.deepEqual(
            result,
            {
                verified: false,
                reason:
                    "missing-timestamp"
            }
        );
    }
);

test(
    "non-integer timestamp is rejected",
    async () => {
        const keys =
            await createKeyPair();

        const result =
            await verifyTelnyxWebhookSignature({
                rawBody:
                    "{}",
                signature:
                    "AAAA",
                timestamp:
                    "not-a-timestamp",
                publicKey:
                    keys.publicKey,
                nowMs:
                    NOW_MS
            });

        assert.deepEqual(
            result,
            {
                verified: false,
                reason:
                    "invalid-timestamp"
            }
        );
    }
);

test(
    "old timestamp beyond replay window is rejected",
    async () => {
        const keys =
            await createKeyPair();

        const timestamp =
            String(
                NOW_SECONDS -
                301
            );

        const signature =
            await sign(
                keys.privateKey,
                timestamp,
                "{}"
            );

        const result =
            await verifyTelnyxWebhookSignature({
                rawBody:
                    "{}",
                signature,
                timestamp,
                publicKey:
                    keys.publicKey,
                nowMs:
                    NOW_MS
            });

        assert.deepEqual(
            result,
            {
                verified: false,
                reason:
                    "stale-timestamp"
            }
        );
    }
);

test(
    "future timestamp beyond replay window is rejected",
    async () => {
        const keys =
            await createKeyPair();

        const timestamp =
            String(
                NOW_SECONDS +
                301
            );

        const signature =
            await sign(
                keys.privateKey,
                timestamp,
                "{}"
            );

        const result =
            await verifyTelnyxWebhookSignature({
                rawBody:
                    "{}",
                signature,
                timestamp,
                publicKey:
                    keys.publicKey,
                nowMs:
                    NOW_MS
            });

        assert.deepEqual(
            result,
            {
                verified: false,
                reason:
                    "stale-timestamp"
            }
        );
    }
);

test(
    "timestamp exactly on configured freshness boundary is accepted",
    async () => {
        const keys =
            await createKeyPair();

        const timestamp =
            String(
                NOW_SECONDS -
                300
            );

        const signature =
            await sign(
                keys.privateKey,
                timestamp,
                "{}"
            );

        const result =
            await verifyTelnyxWebhookSignature({
                rawBody:
                    "{}",
                signature,
                timestamp,
                publicKey:
                    keys.publicKey,
                nowMs:
                    NOW_MS
            });

        assert.equal(
            result.verified,
            true
        );

        if(result.verified){
            assert.equal(
                result.ageSeconds,
                300
            );
        }
    }
);

test(
    "malformed base64 signature is rejected deterministically",
    async () => {
        const keys =
            await createKeyPair();

        const result =
            await verifyTelnyxWebhookSignature({
                rawBody:
                    "{}",
                signature:
                    "not***base64",
                timestamp:
                    String(NOW_SECONDS),
                publicKey:
                    keys.publicKey,
                nowMs:
                    NOW_MS
            });

        assert.deepEqual(
            result,
            {
                verified: false,
                reason:
                    "invalid-signature-encoding"
            }
        );
    }
);

test(
    "decoded signature must have the Ed25519 signature length",
    async () => {
        const keys =
            await createKeyPair();

        const result =
            await verifyTelnyxWebhookSignature({
                rawBody:
                    "{}",
                signature:
                    "AAAA",
                timestamp:
                    String(NOW_SECONDS),
                publicKey:
                    keys.publicKey,
                nowMs:
                    NOW_MS
            });

        assert.deepEqual(
            result,
            {
                verified: false,
                reason:
                    "invalid-signature-encoding"
            }
        );
    }
);

test(
    "invalid replay-window configuration fails closed as programmer error",
    async () => {
        const keys =
            await createKeyPair();

        await assert.rejects(
            () =>
                verifyTelnyxWebhookSignature({
                    rawBody:
                        "{}",
                    signature:
                        "AAAA",
                    timestamp:
                        String(NOW_SECONDS),
                    publicKey:
                        keys.publicKey,
                    nowMs:
                        NOW_MS,
                    maximumTimestampSkewSeconds:
                        -1
                }),
            /non-negative/
        );
    }
);
