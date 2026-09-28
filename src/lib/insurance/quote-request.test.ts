import assert from "node:assert/strict";
import test from "node:test";

import {
    buildInsuranceQuoteRequestRecords
} from "./quote-request";


function dependencies(){
    let sequence =
        0;

    return {
        now(){
            return "2026-09-28T16:30:00.000Z";
        },

        createUuid(){
            sequence += 1;

            return `id-${sequence}`;
        }
    };
}

test(
    "quote request builds canonical phone-only lead records",
    () => {
        const result =
            buildInsuranceQuoteRequestRecords(
                {
                    firstName:
                        " River ",
                    lastName:
                        " Young ",
                    phone:
                        " 432-555-0100 ",
                    state:
                        "tx",
                    postalCode:
                        "79720",
                    productInterest:
                        "auto",
                    consent: {
                        phone:
                            true,
                        sms:
                            false,
                        textVersion:
                            " quote-v1 "
                    },
                    campaign:
                        " launch "
                },
                dependencies()
            );

        assert.equal(
            result.relationship.relationshipId,
            "relationship:id-1"
        );

        assert.equal(
            result.relationship.displayName,
            "River Young"
        );

        assert.equal(
            result.relationship.kind,
            "lead"
        );

        assert.equal(
            result.relationship.stage,
            "new"
        );

        assert.equal(
            result.relationship.source,
            "website"
        );

        assert.equal(
            result.insuranceProfile.state,
            "TX"
        );

        assert.equal(
            result.insuranceProfile.quoteStatus,
            "requested"
        );

        assert.equal(
            result.acquisition.campaign,
            "launch"
        );

        assert.equal(
            result.consents.length,
            2
        );

        assert.equal(
            result.consents[0]?.channel,
            "phone"
        );

        assert.equal(
            result.consents[0]?.status,
            "granted"
        );

        assert.equal(
            result.consents[1]?.channel,
            "sms"
        );

        assert.equal(
            result.consents[1]?.status,
            "denied"
        );

        assert.deepEqual(
            result.events.map(
                event =>
                    event.eventType
            ),
            [
                "lead-created",
                "quote-requested"
            ]
        );
    }
);

test(
    "quote request accepts email-only lead and normalizes email",
    () => {
        const result =
            buildInsuranceQuoteRequestRecords(
                {
                    firstName:
                        "Jane",
                    lastName:
                        "River",
                    email:
                        " TEST@EXAMPLE.COM ",
                    state:
                        "TX",
                    postalCode:
                        "79720",
                    productInterest:
                        "home",
                    consent: {
                        email:
                            true,
                        textVersion:
                            "quote-v1"
                    }
                },
                dependencies()
            );

        assert.equal(
            result.relationship.email,
            "test@example.com"
        );

        assert.equal(
            result.consents.length,
            1
        );

        assert.equal(
            result.consents[0]?.channel,
            "email"
        );

        assert.equal(
            result.consents[0]?.status,
            "granted"
        );
    }
);

test(
    "quote request accepts both phone and email with explicit consent",
    () => {
        const result =
            buildInsuranceQuoteRequestRecords(
                {
                    firstName:
                        "Both",
                    lastName:
                        "Channels",
                    phone:
                        "4325550100",
                    email:
                        "both@example.com",
                    state:
                        "TX",
                    postalCode:
                        "79720",
                    productInterest:
                        "life",
                    consent: {
                        phone:
                            true,
                        sms:
                            true,
                        email:
                            false,
                        textVersion:
                            "quote-v1"
                    }
                },
                dependencies()
            );

        assert.deepEqual(
            result.consents.map(
                consent =>
                    [
                        consent.channel,
                        consent.status
                    ]
            ),
            [
                [
                    "phone",
                    "granted"
                ],
                [
                    "sms",
                    "granted"
                ],
                [
                    "email",
                    "denied"
                ]
            ]
        );
    }
);

test(
    "quote request uses one server timestamp across every created record",
    () => {
        const result =
            buildInsuranceQuoteRequestRecords(
                {
                    firstName:
                        "Time",
                    lastName:
                        "Check",
                    email:
                        "time@example.com",
                    state:
                        "TX",
                    postalCode:
                        "79720",
                    productInterest:
                        "renters",
                    consent: {
                        email:
                            true,
                        textVersion:
                            "quote-v1"
                    }
                },
                dependencies()
            );

        const timestamp =
            "2026-09-28T16:30:00.000Z";

        assert.equal(
            result.relationship.createdAt,
            timestamp
        );

        assert.equal(
            result.relationship.updatedAt,
            timestamp
        );

        assert.equal(
            result.acquisition.capturedAt,
            timestamp
        );

        assert.equal(
            result.insuranceProfile.createdAt,
            timestamp
        );

        assert.equal(
            result.consents[0]?.capturedAt,
            timestamp
        );

        assert.equal(
            result.events[0]?.occurredAt,
            timestamp
        );

        assert.equal(
            result.events[1]?.occurredAt,
            timestamp
        );
    }
);

test(
    "quote request generates all canonical identities server-side",
    () => {
        const result =
            buildInsuranceQuoteRequestRecords(
                {
                    firstName:
                        "Identity",
                    lastName:
                        "Check",
                    email:
                        "id@example.com",
                    state:
                        "TX",
                    postalCode:
                        "79720",
                    productInterest:
                        "umbrella",
                    consent: {
                        email:
                            true,
                        textVersion:
                            "quote-v1"
                    }
                },
                dependencies()
            );

        assert.equal(
            result.relationship.relationshipId,
            "relationship:id-1"
        );

        assert.equal(
            result.consents[0]?.consentId,
            "consent:id-2"
        );

        assert.equal(
            result.events[0]?.eventId,
            "crm-event:id-3"
        );

        assert.equal(
            result.events[1]?.eventId,
            "crm-event:id-4"
        );
    }
);

test(
    "quote request rejects missing phone and email",
    () => {
        assert.throws(
            () =>
                buildInsuranceQuoteRequestRecords(
                    {
                        firstName:
                            "No",
                        lastName:
                            "Contact",
                        state:
                            "TX",
                        postalCode:
                            "79720",
                        productInterest:
                            "auto",
                        consent: {
                            textVersion:
                                "quote-v1"
                        }
                    },
                    dependencies()
                ),
            /requires phone or email/
        );
    }
);

test(
    "quote request rejects granted phone or sms consent without phone",
    () => {
        assert.throws(
            () =>
                buildInsuranceQuoteRequestRecords(
                    {
                        firstName:
                            "Bad",
                        lastName:
                            "Phone",
                        email:
                            "bad@example.com",
                        state:
                            "TX",
                        postalCode:
                            "79720",
                        productInterest:
                            "auto",
                        consent: {
                            phone:
                                true,
                            email:
                                true,
                            textVersion:
                                "quote-v1"
                        }
                    },
                    dependencies()
                ),
            /without a phone number/
        );

        assert.throws(
            () =>
                buildInsuranceQuoteRequestRecords(
                    {
                        firstName:
                            "Bad",
                        lastName:
                            "Sms",
                        email:
                            "bad@example.com",
                        state:
                            "TX",
                        postalCode:
                            "79720",
                        productInterest:
                            "auto",
                        consent: {
                            sms:
                                true,
                            email:
                                true,
                            textVersion:
                                "quote-v1"
                        }
                    },
                    dependencies()
                ),
            /without a phone number/
        );
    }
);

test(
    "quote request rejects granted email consent without email",
    () => {
        assert.throws(
            () =>
                buildInsuranceQuoteRequestRecords(
                    {
                        firstName:
                            "Bad",
                        lastName:
                            "Email",
                        phone:
                            "4325550100",
                        state:
                            "TX",
                        postalCode:
                            "79720",
                        productInterest:
                            "auto",
                        consent: {
                            phone:
                                true,
                            email:
                                true,
                            textVersion:
                                "quote-v1"
                        }
                    },
                    dependencies()
                ),
            /without an email address/
        );
    }
);

test(
    "quote request rejects when no contact channel is granted",
    () => {
        assert.throws(
            () =>
                buildInsuranceQuoteRequestRecords(
                    {
                        firstName:
                            "Denied",
                        lastName:
                            "Everywhere",
                        phone:
                            "4325550100",
                        email:
                            "denied@example.com",
                        state:
                            "TX",
                        postalCode:
                            "79720",
                        productInterest:
                            "auto",
                        consent: {
                            phone:
                                false,
                            sms:
                                false,
                            email:
                                false,
                            textVersion:
                                "quote-v1"
                        }
                    },
                    dependencies()
                ),
            /at least one granted contact channel/
        );
    }
);

test(
    "quote request requires explicit consent for supplied primary contact channels",
    () => {
        assert.throws(
            () =>
                buildInsuranceQuoteRequestRecords(
                    {
                        firstName:
                            "Missing",
                        lastName:
                            "Consent",
                        phone:
                            "4325550100",
                        state:
                            "TX",
                        postalCode:
                            "79720",
                        productInterest:
                            "auto",
                        consent: {
                            sms:
                                true,
                            textVersion:
                                "quote-v1"
                        }
                    },
                    dependencies()
                ),
            /explicit phone consent/
        );

        assert.throws(
            () =>
                buildInsuranceQuoteRequestRecords(
                    {
                        firstName:
                            "Missing",
                        lastName:
                            "EmailConsent",
                        email:
                            "missing@example.com",
                        state:
                            "TX",
                        postalCode:
                            "79720",
                        productInterest:
                            "auto",
                        consent: {
                            textVersion:
                                "quote-v1"
                        }
                    },
                    dependencies()
                ),
            /explicit email consent/
        );
    }
);

test(
    "quote request rejects forbidden administrative and sensitive fields",
    () => {
        assert.throws(
            () =>
                buildInsuranceQuoteRequestRecords(
                    {
                        firstName:
                            "Admin",
                        lastName:
                            "Injection",
                        email:
                            "admin@example.com",
                        state:
                            "TX",
                        postalCode:
                            "79720",
                        productInterest:
                            "auto",
                        owner:
                            "attacker",
                        consent: {
                            email:
                                true,
                            textVersion:
                                "quote-v1"
                        }
                    },
                    dependencies()
                ),
            /forbids public field owner/
        );

        assert.throws(
            () =>
                buildInsuranceQuoteRequestRecords(
                    {
                        firstName:
                            "Sensitive",
                        lastName:
                            "Injection",
                        email:
                            "sensitive@example.com",
                        state:
                            "TX",
                        postalCode:
                            "79720",
                        productInterest:
                            "auto",
                        ssn:
                            "000-00-0000",
                        consent: {
                            email:
                                true,
                            textVersion:
                                "quote-v1"
                        }
                    },
                    dependencies()
                ),
            /forbids public field ssn/
        );
    }
);

test(
    "quote request rejects unknown public fields",
    () => {
        assert.throws(
            () =>
                buildInsuranceQuoteRequestRecords(
                    {
                        firstName:
                            "Unknown",
                        lastName:
                            "Field",
                        email:
                            "unknown@example.com",
                        state:
                            "TX",
                        postalCode:
                            "79720",
                        productInterest:
                            "auto",
                        mystery:
                            "value",
                        consent: {
                            email:
                                true,
                            textVersion:
                                "quote-v1"
                        }
                    },
                    dependencies()
                ),
            /does not support request field mystery/
        );
    }
);

test(
    "quote request delegates state and postal validation to canonical insurance profile",
    () => {
        assert.throws(
            () =>
                buildInsuranceQuoteRequestRecords(
                    {
                        firstName:
                            "Bad",
                        lastName:
                            "State",
                        email:
                            "badstate@example.com",
                        state:
                            "Texas",
                        postalCode:
                            "79720",
                        productInterest:
                            "auto",
                        consent: {
                            email:
                                true,
                            textVersion:
                                "quote-v1"
                        }
                    },
                    dependencies()
                ),
            /state code/
        );

        assert.throws(
            () =>
                buildInsuranceQuoteRequestRecords(
                    {
                        firstName:
                            "Bad",
                        lastName:
                            "Zip",
                        email:
                            "badzip@example.com",
                        state:
                            "TX",
                        postalCode:
                            "7972",
                        productInterest:
                            "auto",
                        consent: {
                            email:
                                true,
                            textVersion:
                                "quote-v1"
                        }
                    },
                    dependencies()
                ),
            /ZIP/
        );
    }
);

test(
    "quote request rejects unsupported product interest",
    () => {
        assert.throws(
            () =>
                buildInsuranceQuoteRequestRecords(
                    {
                        firstName:
                            "Bad",
                        lastName:
                            "Product",
                        email:
                            "badproduct@example.com",
                        state:
                            "TX",
                        postalCode:
                            "79720",
                        productInterest:
                            "spaceship",
                        consent: {
                            email:
                                true,
                            textVersion:
                                "quote-v1"
                        }
                    },
                    dependencies()
                ),
            /product interest is not supported/
        );
    }
);
