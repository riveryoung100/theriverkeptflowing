import assert from "node:assert/strict";
import test from "node:test";

import {
    buildInsuranceQuoteRequestRecords
} from "./quote-request";

import {
    createInsuranceQuoteRequestFingerprint,
    createInsuranceQuoteRequestFingerprintSource,
    createInsuranceQuoteRequestIdempotencyKey,
    INSURANCE_QUOTE_REQUEST_FINGERPRINT_VERSION,
    INSURANCE_QUOTE_REQUEST_IDEMPOTENCY_KEY_MAX_LENGTH,
    requireInsuranceQuoteRequestFingerprint
} from "./quote-request-idempotency";


function dependencies(
    now:
        string,
    prefix:
        string
){
    let sequence =
        0;

    return {
        now(){
            return now;
        },

        createUuid(){
            sequence +=
                1;

            return `${prefix}-${sequence}`;
        }
    };
}


function logicalRequest(){
    return {
        firstName:
            " River ",

        lastName:
            " Young ",

        email:
            " RIVER@EXAMPLE.COM ",

        phone:
            " 432-555-0100 ",

        state:
            "tx",

        postalCode:
            "79720",

        productInterest:
            "auto" as const,

        sourceVendor:
            " organic ",

        campaign:
            " launch ",

        utmSource:
            " linkedin ",

        consent: {
            phone:
                true,

            sms:
                false,

            email:
                true,

            textVersion:
                " quote-v1 "
        }
    };
}


test(
    "quote request idempotency key canonicalizes a valid opaque token",
    () => {
        assert.equal(
            createInsuranceQuoteRequestIdempotencyKey(
                "  quote:browser_123-abc  "
            ),
            "quote:browser_123-abc"
        );
    }
);


test(
    "quote request idempotency key rejects missing malformed and oversized values",
    () => {
        assert.throws(
            () =>
                createInsuranceQuoteRequestIdempotencyKey(
                    undefined
                ),
            /must be text/
        );

        assert.throws(
            () =>
                createInsuranceQuoteRequestIdempotencyKey(
                    "   "
                ),
            /non-empty/
        );

        assert.throws(
            () =>
                createInsuranceQuoteRequestIdempotencyKey(
                    "contains space"
                ),
            /letters, digits/
        );

        assert.throws(
            () =>
                createInsuranceQuoteRequestIdempotencyKey(
                    "x".repeat(
                        INSURANCE_QUOTE_REQUEST_IDEMPOTENCY_KEY_MAX_LENGTH +
                        1
                    )
                ),
            /at most/
        );
    }
);


test(
    "quote request fingerprint excludes generated identifiers and server timestamps",
    async () => {
        const first =
            buildInsuranceQuoteRequestRecords(
                logicalRequest(),
                dependencies(
                    "2026-09-28T16:30:00.000Z",
                    "first"
                )
            );

        const second =
            buildInsuranceQuoteRequestRecords(
                logicalRequest(),
                dependencies(
                    "2026-10-01T10:00:00.000Z",
                    "second"
                )
            );

        assert.notEqual(
            first.relationship.relationshipId,
            second.relationship.relationshipId
        );

        assert.notEqual(
            first.relationship.createdAt,
            second.relationship.createdAt
        );

        const firstSource =
            createInsuranceQuoteRequestFingerprintSource(
                first
            );

        const secondSource =
            createInsuranceQuoteRequestFingerprintSource(
                second
            );

        assert.equal(
            firstSource,
            secondSource
        );

        assert.equal(
            firstSource.includes(
                first.relationship.relationshipId
            ),
            false
        );

        assert.equal(
            firstSource.includes(
                first.relationship.createdAt
            ),
            false
        );

        assert.match(
            firstSource,
            new RegExp(
                INSURANCE_QUOTE_REQUEST_FINGERPRINT_VERSION
            )
        );

        assert.equal(
            await createInsuranceQuoteRequestFingerprint(
                first
            ),
            await createInsuranceQuoteRequestFingerprint(
                second
            )
        );
    }
);


test(
    "quote request fingerprint changes when normalized logical request content changes",
    async () => {
        const first =
            buildInsuranceQuoteRequestRecords(
                logicalRequest(),
                dependencies(
                    "2026-09-28T16:30:00.000Z",
                    "first"
                )
            );

        const changed =
            buildInsuranceQuoteRequestRecords(
                {
                    ...logicalRequest(),

                    productInterest:
                        "home" as const
                },
                dependencies(
                    "2026-09-28T16:30:00.000Z",
                    "changed"
                )
            );

        assert.notEqual(
            await createInsuranceQuoteRequestFingerprint(
                first
            ),
            await createInsuranceQuoteRequestFingerprint(
                changed
            )
        );
    }
);


test(
    "quote request fingerprint changes when consent semantics change",
    async () => {
        const first =
            buildInsuranceQuoteRequestRecords(
                logicalRequest(),
                dependencies(
                    "2026-09-28T16:30:00.000Z",
                    "first"
                )
            );

        const changed =
            buildInsuranceQuoteRequestRecords(
                {
                    ...logicalRequest(),

                    consent: {
                        ...logicalRequest().consent,

                        email:
                            false
                    }
                },
                dependencies(
                    "2026-09-28T16:30:00.000Z",
                    "changed"
                )
            );

        assert.notEqual(
            await createInsuranceQuoteRequestFingerprint(
                first
            ),
            await createInsuranceQuoteRequestFingerprint(
                changed
            )
        );
    }
);


test(
    "quote request fingerprint validator accepts only lowercase SHA-256 hex",
    async () => {
        const records =
            buildInsuranceQuoteRequestRecords(
                logicalRequest(),
                dependencies(
                    "2026-09-28T16:30:00.000Z",
                    "digest"
                )
            );

        const fingerprint =
            await createInsuranceQuoteRequestFingerprint(
                records
            );

        assert.match(
            fingerprint,
            /^[0-9a-f]{64}$/
        );

        assert.equal(
            requireInsuranceQuoteRequestFingerprint(
                fingerprint
            ),
            fingerprint
        );

        assert.throws(
            () =>
                requireInsuranceQuoteRequestFingerprint(
                    fingerprint.toUpperCase()
                ),
            /lowercase SHA-256/
        );

        assert.throws(
            () =>
                requireInsuranceQuoteRequestFingerprint(
                    "abc123"
                ),
            /lowercase SHA-256/
        );
    }
);
