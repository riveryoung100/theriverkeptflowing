import assert from "node:assert/strict";
import test from "node:test";

import {
    createInsuranceAcquisitionCostFact,
    createInsuranceCommissionFact,
    createInsuranceMoney,
    createInsurancePremiumFact,
    createInsuranceRenewalFact
} from "./acquisition-economics";

import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";


const relationshipId =
    requireRiverCrmRelationshipId(
        "relationship:ins-003c"
    );

const occurredAt =
    "2026-09-29T22:00:00.000Z";


test(
    "creates canonical insurance money",
    () => {
        assert.deepEqual(
            createInsuranceMoney({
                amountMinorUnits:
                    12345,
                currency:
                    " usd "
            }),
            {
                amountMinorUnits:
                    12345,
                currency:
                    "USD"
            }
        );
    }
);


test(
    "rejects floating point and negative ordinary money",
    () => {
        assert.throws(
            () =>
                createInsuranceMoney({
                    amountMinorUnits:
                        12.5,
                    currency:
                        "USD"
                }),
            /finite integer/
        );

        assert.throws(
            () =>
                createInsuranceMoney({
                    amountMinorUnits:
                        -1,
                    currency:
                        "USD"
                }),
            /non-negative/
        );
    }
);


test(
    "rejects malformed currency",
    () => {
        assert.throws(
            () =>
                createInsuranceMoney({
                    amountMinorUnits:
                        100,
                    currency:
                        "US"
                }),
            /three-letter uppercase code/
        );
    }
);


test(
    "creates acquisition cost fact with normalized optional dimensions",
    () => {
        const value =
            createInsuranceAcquisitionCostFact({
                costId:
                    " acquisition-cost:1 ",
                relationshipId,
                category:
                    "lead",
                money: {
                    amountMinorUnits:
                        2500,
                    currency:
                        "usd"
                },
                occurredAt,
                source:
                    " website ",
                vendor:
                    " vendor-a ",
                campaign:
                    " campaign-a "
            });

        assert.deepEqual(
            value,
            {
                costId:
                    "acquisition-cost:1",
                relationshipId,
                category:
                    "lead",
                money: {
                    amountMinorUnits:
                        2500,
                    currency:
                        "USD"
                },
                occurredAt,
                source:
                    "website",
                vendor:
                    "vendor-a",
                campaign:
                    "campaign-a"
            }
        );
    }
);


test(
    "rejects invalid acquisition cost identity category and timestamp",
    () => {
        const base = {
            costId:
                "acquisition-cost:1",
            relationshipId,
            category:
                "lead",
            money: {
                amountMinorUnits:
                    100,
                currency:
                    "USD"
            },
            occurredAt
        };

        assert.throws(
            () =>
                createInsuranceAcquisitionCostFact({
                    ...base,
                    costId:
                        "cost:1"
                }),
            /acquisition-cost:/
        );

        assert.throws(
            () =>
                createInsuranceAcquisitionCostFact({
                    ...base,
                    category:
                        "unknown"
                }),
            /supported acquisition cost category/
        );

        assert.throws(
            () =>
                createInsuranceAcquisitionCostFact({
                    ...base,
                    occurredAt:
                        "invalid"
                }),
            /valid timestamp/
        );
    }
);


test(
    "creates quoted and written premium facts without treating premium as commission",
    () => {
        const quoted =
            createInsurancePremiumFact({
                premiumFactId:
                    "premium-fact:quoted-1",
                relationshipId,
                kind:
                    "quoted",
                money: {
                    amountMinorUnits:
                        180000,
                    currency:
                        "USD"
                },
                occurredAt,
                providerReference:
                    " carrier-a ",
                policyReference:
                    " quote-123 "
            });

        const written =
            createInsurancePremiumFact({
                premiumFactId:
                    "premium-fact:written-1",
                relationshipId,
                kind:
                    "written",
                money: {
                    amountMinorUnits:
                        175000,
                    currency:
                        "USD"
                },
                occurredAt,
                effectiveAt:
                    "2026-10-01T00:00:00.000Z"
            });

        assert.equal(
            quoted.kind,
            "quoted"
        );

        assert.equal(
            quoted.providerReference,
            "carrier-a"
        );

        assert.equal(
            written.kind,
            "written"
        );

        assert.equal(
            written.money.amountMinorUnits,
            175000
        );
    }
);


test(
    "premium fact rejects negative money unsupported kind and malformed effective timestamp",
    () => {
        const base = {
            premiumFactId:
                "premium-fact:1",
            relationshipId,
            kind:
                "written",
            money: {
                amountMinorUnits:
                    100000,
                currency:
                    "USD"
            },
            occurredAt
        };

        assert.throws(
            () =>
                createInsurancePremiumFact({
                    ...base,
                    money: {
                        amountMinorUnits:
                            -1,
                        currency:
                            "USD"
                    }
                }),
            /non-negative/
        );

        assert.throws(
            () =>
                createInsurancePremiumFact({
                    ...base,
                    kind:
                        "bound"
                }),
            /supported premium kind/
        );

        assert.throws(
            () =>
                createInsurancePremiumFact({
                    ...base,
                    effectiveAt:
                        "not-a-date"
                }),
            /valid timestamp/
        );
    }
);


test(
    "commission facts permit signed chargebacks",
    () => {
        const chargeback =
            createInsuranceCommissionFact({
                commissionFactId:
                    "commission-fact:chargeback-1",
                relationshipId,
                kind:
                    "chargeback",
                money: {
                    amountMinorUnits:
                        -4500,
                    currency:
                        "usd"
                },
                occurredAt,
                note:
                    " reversal "
            });

        assert.equal(
            chargeback.money.amountMinorUnits,
            -4500
        );

        assert.equal(
            chargeback.money.currency,
            "USD"
        );

        assert.equal(
            chargeback.note,
            "reversal"
        );
    }
);


test(
    "commission fact rejects unsupported kind and non-integer amount",
    () => {
        const base = {
            commissionFactId:
                "commission-fact:1",
            relationshipId,
            kind:
                "earned",
            money: {
                amountMinorUnits:
                    10000,
                currency:
                    "USD"
            },
            occurredAt
        };

        assert.throws(
            () =>
                createInsuranceCommissionFact({
                    ...base,
                    kind:
                        "projected"
                }),
            /supported commission kind/
        );

        assert.throws(
            () =>
                createInsuranceCommissionFact({
                    ...base,
                    money: {
                        amountMinorUnits:
                            10.25,
                        currency:
                            "USD"
                    }
                }),
            /finite integer/
        );
    }
);


test(
    "creates renewal lifecycle fact",
    () => {
        const value =
            createInsuranceRenewalFact({
                renewalFactId:
                    " renewal-fact:1 ",
                relationshipId,
                kind:
                    "due",
                occurredAt,
                providerReference:
                    " carrier-a ",
                policyReference:
                    " policy-1 ",
                effectiveAt:
                    "2027-10-01T00:00:00.000Z"
            });

        assert.equal(
            value.renewalFactId,
            "renewal-fact:1"
        );

        assert.equal(
            value.kind,
            "due"
        );

        assert.equal(
            value.policyReference,
            "policy-1"
        );
    }
);


test(
    "renewal fact rejects unsupported lifecycle and malformed identity",
    () => {
        const base = {
            renewalFactId:
                "renewal-fact:1",
            relationshipId,
            kind:
                "due",
            occurredAt
        };

        assert.throws(
            () =>
                createInsuranceRenewalFact({
                    ...base,
                    kind:
                        "pending"
                }),
            /supported renewal kind/
        );

        assert.throws(
            () =>
                createInsuranceRenewalFact({
                    ...base,
                    renewalFactId:
                        "renewal:1"
                }),
            /renewal-fact:/
        );
    }
);


test(
    "all economic facts require canonical relationship identity",
    () => {
        assert.throws(
            () =>
                createInsuranceAcquisitionCostFact({
                    costId:
                        "acquisition-cost:bad-relationship",
                    relationshipId:
                        "lead:123",
                    category:
                        "lead",
                    money: {
                        amountMinorUnits:
                            100,
                        currency:
                            "USD"
                    },
                    occurredAt
                }),
            /relationship/
        );
    }
);
