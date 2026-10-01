import type {
    InsuranceQuoteRequestRecords
} from "./quote-request";


export const INSURANCE_QUOTE_REQUEST_IDEMPOTENCY_KEY_MAX_LENGTH =
    128;

export const INSURANCE_QUOTE_REQUEST_FINGERPRINT_VERSION =
    "insurance-quote-request-fingerprint-v1";

export type InsuranceQuoteRequestIdempotencyKey =
    string & {
        readonly __insuranceQuoteRequestIdempotencyKey:
            true;
    };

export type InsuranceQuoteRequestFingerprint =
    string & {
        readonly __insuranceQuoteRequestFingerprint:
            true;
    };


function optionalText(
    value:
        string |
        undefined
): string | null {
    return value === undefined
        ? null
        : value;
}


function compareConsent(
    left:
        InsuranceQuoteRequestRecords["consents"][number],
    right:
        InsuranceQuoteRequestRecords["consents"][number]
): number {
    const channel =
        left.channel.localeCompare(
            right.channel
        );

    if(channel !== 0){
        return channel;
    }

    const status =
        left.status.localeCompare(
            right.status
        );

    if(status !== 0){
        return status;
    }

    return (
        left.consentTextVersion ??
        ""
    ).localeCompare(
        right.consentTextVersion ??
        ""
    );
}


function bytesToHex(
    bytes:
        Uint8Array
): string {
    return Array.from(
        bytes,
        value =>
            value
                .toString(16)
                .padStart(
                    2,
                    "0"
                )
    ).join("");
}


export function createInsuranceQuoteRequestIdempotencyKey(
    value:
        unknown
):
    InsuranceQuoteRequestIdempotencyKey {

    if(
        typeof value !==
            "string"
    ){
        throw new TypeError(
            "Insurance quote request idempotency key must be text."
        );
    }

    const key =
        value.trim();

    if(key.length === 0){
        throw new TypeError(
            "Insurance quote request idempotency key must be non-empty."
        );
    }

    if(
        key.length >
        INSURANCE_QUOTE_REQUEST_IDEMPOTENCY_KEY_MAX_LENGTH
    ){
        throw new TypeError(
            `Insurance quote request idempotency key must be at most ${INSURANCE_QUOTE_REQUEST_IDEMPOTENCY_KEY_MAX_LENGTH} characters.`
        );
    }

    if(
        !/^[A-Za-z0-9._:-]+$/.test(
            key
        )
    ){
        throw new TypeError(
            "Insurance quote request idempotency key must contain only letters, digits, dot, underscore, colon, or hyphen."
        );
    }

    return key as
        InsuranceQuoteRequestIdempotencyKey;
}


export function createInsuranceQuoteRequestFingerprintSource(
    records:
        InsuranceQuoteRequestRecords
): string {

    const consents =
        [...records.consents]
            .sort(
                compareConsent
            )
            .map(
                consent => ({
                    channel:
                        consent.channel,

                    status:
                        consent.status,

                    consentTextVersion:
                        optionalText(
                            consent.consentTextVersion
                        ),

                    doNotContact:
                        consent.doNotContact
                })
            );

    const value = {
        version:
            INSURANCE_QUOTE_REQUEST_FINGERPRINT_VERSION,

        contact: {
            displayName:
                records.relationship
                    .displayName,

            email:
                optionalText(
                    records.relationship
                        .email
                ),

            phone:
                optionalText(
                    records.relationship
                        .phone
                )
        },

        insurance: {
            state:
                records.insuranceProfile
                    .state,

            postalCode:
                records.insuranceProfile
                    .postalCode,

            productInterest:
                records.insuranceProfile
                    .productInterest
        },

        attribution: {
            sourceVendor:
                optionalText(
                    records.acquisition
                        .sourceVendor
                ),

            campaign:
                optionalText(
                    records.acquisition
                        .campaign
                ),

            adOrCreativeId:
                optionalText(
                    records.acquisition
                        .adOrCreativeId
                ),

            landingPage:
                optionalText(
                    records.acquisition
                        .landingPage
                ),

            utmSource:
                optionalText(
                    records.acquisition
                        .utmSource
                ),

            utmMedium:
                optionalText(
                    records.acquisition
                        .utmMedium
                ),

            utmCampaign:
                optionalText(
                    records.acquisition
                        .utmCampaign
                ),

            utmTerm:
                optionalText(
                    records.acquisition
                        .utmTerm
                ),

            utmContent:
                optionalText(
                    records.acquisition
                        .utmContent
                ),

            referralSource:
                optionalText(
                    records.acquisition
                        .referralSource
                )
        },

        consents
    };

    return JSON.stringify(
        value
    );
}


export async function createInsuranceQuoteRequestFingerprint(
    records:
        InsuranceQuoteRequestRecords
):
    Promise<
        InsuranceQuoteRequestFingerprint
    > {

    const source =
        createInsuranceQuoteRequestFingerprintSource(
            records
        );

    const encoded =
        new TextEncoder()
            .encode(
                source
            );

    const digest =
        await globalThis
            .crypto
            .subtle
            .digest(
                "SHA-256",
                encoded
            );

    return bytesToHex(
        new Uint8Array(
            digest
        )
    ) as
        InsuranceQuoteRequestFingerprint;
}


export function requireInsuranceQuoteRequestFingerprint(
    value:
        unknown
):
    InsuranceQuoteRequestFingerprint {

    if(
        typeof value !==
            "string" ||
        !/^[0-9a-f]{64}$/.test(
            value
        )
    ){
        throw new TypeError(
            "Insurance quote request fingerprint must be a lowercase SHA-256 hex digest."
        );
    }

    return value as
        InsuranceQuoteRequestFingerprint;
}
