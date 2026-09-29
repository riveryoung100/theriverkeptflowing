import assert from "node:assert/strict";
import test from "node:test";

import {
    handleTelnyxWebhook,
    type ApplyVerifiedTelnyxWebhookEvent
} from "./telnyx-webhook-route";

import {
    importTelnyxWebhookPublicKey
} from "./telnyx-webhook-public-key";

const NOW_SECONDS =
    1_799_999_000;

const NOW_MS =
    NOW_SECONDS *
    1000;

async function createKeyPair():
Promise<CryptoKeyPair> {
    return await globalThis.crypto.subtle.generateKey(
        {
            name:
                "Ed25519"
        },
        true,
        [
            "sign",
            "verify"
        ]
    ) as CryptoKeyPair;
}

function toBase64(
    bytes:
        ArrayBuffer
): string {
    const view =
        new Uint8Array(
            bytes
        );

    let binary =
        "";

    for(const byte of view){
        binary +=
            String.fromCharCode(
                byte
            );
    }

    return globalThis.btoa(
        binary
    );
}

async function exportPublicKeyBase64(
    publicKey:
        CryptoKey
): Promise<string> {
    const raw =
        await globalThis.crypto.subtle.exportKey(
            "raw",
            publicKey
        );

    return toBase64(
        raw
    );
}

async function sign(
    privateKey:
        CryptoKey,
    rawBody:
        string,
    timestamp =
        String(NOW_SECONDS)
): Promise<string> {
    const material =
        new TextEncoder().encode(
            `${timestamp}|${rawBody}`
        );

    const signature =
        await globalThis.crypto.subtle.sign(
            {
                name:
                    "Ed25519"
            },
            privateKey,
            material
        );

    return toBase64(
        signature
    );
}

function supportedBody(){
    return JSON.stringify({
        data: {
            id:
                "event:f5:1",
            record_type:
                "event",
            event_type:
                "call.answered",
            occurred_at:
                "2027-01-15T07:43:20.000Z",
            payload: {
                call_control_id:
                    "call-control:f5:1"
            }
        }
    });
}

function unsupportedBody(){
    return JSON.stringify({
        data: {
            id:
                "event:f5:unsupported",
            record_type:
                "event",
            event_type:
                "call.playback.started",
            occurred_at:
                "2027-01-15T07:43:20.000Z",
            payload: {
                call_control_id:
                    "call-control:f5:unsupported"
            }
        }
    });
}

async function signedRequest(
    body:
        string,
    privateKey:
        CryptoKey,
    timestamp =
        String(NOW_SECONDS)
): Promise<Request> {
    return new Request(
        "https://example.test/api/insurance/telnyx-webhook",
        {
            method:
                "POST",
            headers: {
                "content-type":
                    "application/json",
                "telnyx-signature-ed25519":
                    await sign(
                        privateKey,
                        body,
                        timestamp
                    ),
                "telnyx-timestamp":
                    timestamp
            },
            body
        }
    );
}

function applicationReturning(
    acknowledgement:
        | {
            readonly acknowledge: true;
            readonly retry: false;
            readonly classification:
                "accepted" |
                "ignored";
        }
        | {
            readonly acknowledge: false;
            readonly retry: true;
            readonly classification:
                "transient";
        }
){
    let calls =
        0;

    const application:
        ApplyVerifiedTelnyxWebhookEvent = {
            async apply(){
                calls +=
                    1;

                return {
                    application: {
                        handled:
                            false,
                        reason:
                            "correlation-not-found"
                    },
                    acknowledgement
                };
            }
        };

    return {
        application,
        calls: () =>
            calls
    };
}

test(
    "imports Telnyx Base64 raw Ed25519 public key for verification only",
    async () => {
        const keys =
            await createKeyPair();

        const encoded =
            await exportPublicKeyBase64(
                keys.publicKey
            );

        const imported =
            await importTelnyxWebhookPublicKey(
                encoded
            );

        assert.equal(
            imported.type,
            "public"
        );

        assert.equal(
            imported.algorithm.name,
            "Ed25519"
        );

        assert.deepEqual(
            imported.usages,
            [
                "verify"
            ]
        );
    }
);

test(
    "public key importer rejects malformed Base64",
    async () => {
        await assert.rejects(
            async () =>
                importTelnyxWebhookPublicKey(
                    "not***base64"
                ),
            /valid Base64/
        );
    }
);

test(
    "public key importer rejects non-32-byte raw keys",
    async () => {
        await assert.rejects(
            async () =>
                importTelnyxWebhookPublicKey(
                    globalThis.btoa(
                        "too-short"
                    )
                ),
            /32 bytes/
        );
    }
);

test(
    "invalid signature is rejected before normalization or D1 application",
    async () => {
        const keys =
            await createKeyPair();

        const otherKeys =
            await createKeyPair();

        const body =
            supportedBody();

        const request =
            await signedRequest(
                body,
                otherKeys.privateKey
            );

        const fake =
            applicationReturning({
                acknowledge:
                    true,
                retry:
                    false,
                classification:
                    "accepted"
            });

        const response =
            await handleTelnyxWebhook({
                request,
                publicKey:
                    keys.publicKey,
                application:
                    fake.application,
                nowMs:
                    NOW_MS
            });

        assert.equal(
            response.status,
            401
        );

        assert.equal(
            fake.calls(),
            0
        );
    }
);

test(
    "authenticated unsupported events acknowledge without D1 application",
    async () => {
        const keys =
            await createKeyPair();

        const body =
            unsupportedBody();

        const fake =
            applicationReturning({
                acknowledge:
                    true,
                retry:
                    false,
                classification:
                    "accepted"
            });

        const response =
            await handleTelnyxWebhook({
                request:
                    await signedRequest(
                        body,
                        keys.privateKey
                    ),
                publicKey:
                    keys.publicKey,
                application:
                    fake.application,
                nowMs:
                    NOW_MS
            });

        assert.equal(
            response.status,
            204
        );

        assert.equal(
            fake.calls(),
            0
        );
    }
);

test(
    "authenticated invalid JSON returns 400 without D1 application",
    async () => {
        const keys =
            await createKeyPair();

        const body =
            "{invalid-json";

        const fake =
            applicationReturning({
                acknowledge:
                    true,
                retry:
                    false,
                classification:
                    "accepted"
            });

        const response =
            await handleTelnyxWebhook({
                request:
                    await signedRequest(
                        body,
                        keys.privateKey
                    ),
                publicKey:
                    keys.publicKey,
                application:
                    fake.application,
                nowMs:
                    NOW_MS
            });

        assert.equal(
            response.status,
            400
        );

        assert.equal(
            fake.calls(),
            0
        );
    }
);

test(
    "authenticated supported V2 event is applied exactly once and acknowledged",
    async () => {
        const keys =
            await createKeyPair();

        const body =
            supportedBody();

        const fake =
            applicationReturning({
                acknowledge:
                    true,
                retry:
                    false,
                classification:
                    "accepted"
            });

        const response =
            await handleTelnyxWebhook({
                request:
                    await signedRequest(
                        body,
                        keys.privateKey
                    ),
                publicKey:
                    keys.publicKey,
                application:
                    fake.application,
                nowMs:
                    NOW_MS
            });

        assert.equal(
            response.status,
            204
        );

        assert.equal(
            fake.calls(),
            1
        );
    }
);

test(
    "transient application outcome returns non-2xx for provider redelivery",
    async () => {
        const keys =
            await createKeyPair();

        const body =
            supportedBody();

        const fake =
            applicationReturning({
                acknowledge:
                    false,
                retry:
                    true,
                classification:
                    "transient"
            });

        const response =
            await handleTelnyxWebhook({
                request:
                    await signedRequest(
                        body,
                        keys.privateKey
                    ),
                publicKey:
                    keys.publicKey,
                application:
                    fake.application,
                nowMs:
                    NOW_MS
            });

        assert.equal(
            response.status,
            503
        );

        assert.equal(
            fake.calls(),
            1
        );
    }
);

test(
    "stale signature is rejected before D1 application",
    async () => {
        const keys =
            await createKeyPair();

        const body =
            supportedBody();

        const fake =
            applicationReturning({
                acknowledge:
                    true,
                retry:
                    false,
                classification:
                    "accepted"
            });

        const response =
            await handleTelnyxWebhook({
                request:
                    await signedRequest(
                        body,
                        keys.privateKey,
                        String(
                            NOW_SECONDS -
                            301
                        )
                    ),
                publicKey:
                    keys.publicKey,
                application:
                    fake.application,
                nowMs:
                    NOW_MS
            });

        assert.equal(
            response.status,
            401
        );

        assert.equal(
            fake.calls(),
            0
        );
    }
);
