export const TELNYX_WEBHOOK_SIGNATURE_HEADER =
    "telnyx-signature-ed25519";

export const TELNYX_WEBHOOK_TIMESTAMP_HEADER =
    "telnyx-timestamp";

export const DEFAULT_TELNYX_WEBHOOK_MAXIMUM_TIMESTAMP_SKEW_SECONDS =
    300;

export type TelnyxWebhookSignatureVerificationFailureReason =
    | "missing-signature"
    | "missing-timestamp"
    | "invalid-timestamp"
    | "stale-timestamp"
    | "invalid-signature-encoding"
    | "invalid-signature";

export type TelnyxWebhookSignatureVerificationResult =
    | {
        readonly verified: true;
        readonly timestampSeconds: number;
        readonly ageSeconds: number;
    }
    | {
        readonly verified: false;
        readonly reason:
            TelnyxWebhookSignatureVerificationFailureReason;
    };

export interface VerifyTelnyxWebhookSignatureInput {
    readonly rawBody: string;

    readonly signature:
        | string
        | null
        | undefined;

    readonly timestamp:
        | string
        | null
        | undefined;

    readonly publicKey: CryptoKey;

    readonly nowMs?: number;

    readonly maximumTimestampSkewSeconds?:
        number;
}

function requireMaximumTimestampSkewSeconds(
    value:
        number |
        undefined
): number {
    const resolved =
        value ??
        DEFAULT_TELNYX_WEBHOOK_MAXIMUM_TIMESTAMP_SKEW_SECONDS;

    if(
        !Number.isFinite(resolved) ||
        resolved < 0
    ){
        throw new RangeError(
            "Telnyx webhook maximum timestamp skew must be a finite non-negative number."
        );
    }

    return resolved;
}

function parseTimestampSeconds(
    value: string
): number | null {
    const trimmed =
        value.trim();

    if(
        trimmed.length === 0 ||
        !/^\d+$/.test(trimmed)
    ){
        return null;
    }

    const parsed =
        Number(trimmed);

    if(
        !Number.isSafeInteger(parsed) ||
        parsed < 0
    ){
        return null;
    }

    return parsed;
}

function decodeBase64Signature(
    value: string
): Uint8Array<ArrayBuffer> | null {
    const trimmed =
        value.trim();

    if(
        trimmed.length === 0 ||
        trimmed.length % 4 === 1 ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(trimmed)
    ){
        return null;
    }

    try {
        const decoded =
            globalThis.atob(trimmed);

        const bytes =
            new Uint8Array(
                new ArrayBuffer(
                    decoded.length
                )
            );

        for(
            let index = 0;
            index < decoded.length;
            index += 1
        ){
            bytes[index] =
                decoded.charCodeAt(index);
        }

        return bytes.length === 64
            ? bytes
            : null;
    }
    catch {
        return null;
    }
}

export async function verifyTelnyxWebhookSignature(
    input: VerifyTelnyxWebhookSignatureInput
): Promise<TelnyxWebhookSignatureVerificationResult> {
    if(
        input.signature === undefined ||
        input.signature === null ||
        input.signature.trim().length === 0
    ){
        return {
            verified: false,
            reason: "missing-signature"
        };
    }

    if(
        input.timestamp === undefined ||
        input.timestamp === null ||
        input.timestamp.trim().length === 0
    ){
        return {
            verified: false,
            reason: "missing-timestamp"
        };
    }

    const timestampSeconds =
        parseTimestampSeconds(
            input.timestamp
        );

    if(timestampSeconds === null){
        return {
            verified: false,
            reason: "invalid-timestamp"
        };
    }

    const maximumTimestampSkewSeconds =
        requireMaximumTimestampSkewSeconds(
            input.maximumTimestampSkewSeconds
        );

    const nowMs =
        input.nowMs ??
        Date.now();

    if(!Number.isFinite(nowMs)){
        throw new RangeError(
            "Telnyx webhook verification nowMs must be finite."
        );
    }

    const nowSeconds =
        nowMs / 1000;

    const ageSeconds =
        nowSeconds -
        timestampSeconds;

    if(
        Math.abs(ageSeconds) >
        maximumTimestampSkewSeconds
    ){
        return {
            verified: false,
            reason: "stale-timestamp"
        };
    }

    const signatureBytes =
        decodeBase64Signature(
            input.signature
        );

    if(signatureBytes === null){
        return {
            verified: false,
            reason: "invalid-signature-encoding"
        };
    }

    const signedMaterial =
        new TextEncoder().encode(
            `${input.timestamp}|${input.rawBody}`
        );

    const verified =
        await globalThis.crypto.subtle.verify(
            {
                name: "Ed25519"
            },
            input.publicKey,
            signatureBytes,
            signedMaterial
        );

    if(!verified){
        return {
            verified: false,
            reason: "invalid-signature"
        };
    }

    return {
        verified: true,
        timestampSeconds,
        ageSeconds
    };
}
