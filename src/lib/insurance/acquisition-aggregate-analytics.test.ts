import assert from "node:assert/strict";
import test from "node:test";

import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";

import type {
    InsuranceLeadPresentation
} from "./lead-presentation";

import type {
    InsuranceAttributedRelationshipEconomicsView
} from "./d1-acquisition-economics-view";

import {
    createInsuranceAcquisitionCostFact,
    createInsuranceCommissionFact,
    createInsurancePremiumFact
} from "./acquisition-economics";

import {
    createInsuranceRelationshipAcquisitionAnalytics
} from "./acquisition-analytics";

import {
    createInsuranceAcquisitionAggregateAnalytics
} from "./acquisition-aggregate-analytics";


const occurredAt =
    "2026-09-30T00:00:00.000Z";


function relationshipId(
    value:
        string
): RiverCrmRelationshipId {
    return `relationship:${value}` as
        RiverCrmRelationshipId;
}


function presentation(
    id:
        RiverCrmRelationshipId,
    input:
        {
            readonly acquisitionSource?:
                string;

            readonly sourceVendor?:
                string;

            readonly campaign?:
                string;

            readonly productInterest?:
                "home" | "auto";

            readonly state?:
                string;

            readonly quoteStatus?:
                "quoted" | "bound";

            readonly assignedProducer?:
                string;
        } = {}
): InsuranceLeadPresentation {
    return {
        relationshipId:
            id,

        state:
            input.state ?? "TX",

        postalCode:
            "79720",

        productInterest:
            input.productInterest ?? "home",

        quoteStatus:
            input.quoteStatus ?? "quoted",

        ...(input.assignedProducer !== undefined
            ? {
                assignedProducer:
                    input.assignedProducer
            }
            : {}),

        ...(input.acquisitionSource !== undefined
            ? {
                acquisitionSource:
                    input.acquisitionSource
            }
            : {}),

        ...(input.sourceVendor !== undefined
            ? {
                sourceVendor:
                    input.sourceVendor
            }
            : {}),

        ...(input.campaign !== undefined
            ? {
                campaign:
                    input.campaign
            }
            : {}),

        consentChannels:
            [],

        doNotContact:
            false,

        recentEvents:
            []
    };
}


function view(
    suffix:
        string,
    input:
        {
            readonly currency?:
                string;

            readonly acquisitionCostMinorUnits?:
                number;

            readonly writtenPremiumMinorUnits?:
                number;

            readonly paidCommissionMinorUnits?:
                number;

            readonly acquisitionSource?:
                string;

            readonly sourceVendor?:
                string;

            readonly campaign?:
                string;

            readonly includePresentation?:
                boolean;
        } = {}
): InsuranceAttributedRelationshipEconomicsView {
    const id =
        relationshipId(
            suffix
        );

    const currency =
        input.currency ?? "USD";

    const acquisitionCostMinorUnits =
        input.acquisitionCostMinorUnits ?? 0;

    const writtenPremiumMinorUnits =
        input.writtenPremiumMinorUnits ?? 0;

    const paidCommissionMinorUnits =
        input.paidCommissionMinorUnits ?? 0;

    const analytics =
        createInsuranceRelationshipAcquisitionAnalytics({
            relationshipId:
                id,

            acquisitionCosts:
                acquisitionCostMinorUnits === 0
                    ? []
                    : [
                        createInsuranceAcquisitionCostFact({
                            costId:
                                `acquisition-cost:${suffix}`,

                            relationshipId:
                                id,

                            category:
                                "advertising",

                            money: {
                                amountMinorUnits:
                                    acquisitionCostMinorUnits,

                                currency
                            },

                            occurredAt
                        })
                    ],

            premiumFacts:
                writtenPremiumMinorUnits === 0
                    ? []
                    : [
                        createInsurancePremiumFact({
                            premiumFactId:
                                `premium-fact:${suffix}`,

                            relationshipId:
                                id,

                            kind:
                                "written",

                            money: {
                                amountMinorUnits:
                                    writtenPremiumMinorUnits,

                                currency
                            },

                            occurredAt
                        })
                    ],

            commissionFacts:
                paidCommissionMinorUnits === 0
                    ? []
                    : [
                        createInsuranceCommissionFact({
                            commissionFactId:
                                `commission-fact:${suffix}`,

                            relationshipId:
                                id,

                            kind:
                                "paid",

                            money: {
                                amountMinorUnits:
                                    paidCommissionMinorUnits,

                                currency
                            },

                            occurredAt
                        })
                    ]
        });

    return {
        relationshipId:
            id,

        analytics,

        ...(
            input.includePresentation === false
                ? {}
                : {
                    presentation:
                        presentation(
                            id,
                            {
                                ...(input.acquisitionSource !== undefined
                                    ? {
                                        acquisitionSource:
                                            input.acquisitionSource
                                    }
                                    : {}),

                                ...(input.sourceVendor !== undefined
                                    ? {
                                        sourceVendor:
                                            input.sourceVendor
                                    }
                                    : {}),

                                ...(input.campaign !== undefined
                                    ? {
                                        campaign:
                                            input.campaign
                                    }
                                    : {})
                            }
                        )
                }
        )
    };
}


test(
    "aggregates relationship economics by acquisition source without mixing currencies",
    () => {
        const result =
            createInsuranceAcquisitionAggregateAnalytics({
                dimension:
                    "acquisitionSource",

                views: [
                    view(
                        "h1",
                        {
                            acquisitionSource:
                                "website",

                            currency:
                                "USD",

                            acquisitionCostMinorUnits:
                                4000,

                            writtenPremiumMinorUnits:
                                220000,

                            paidCommissionMinorUnits:
                                16000
                        }
                    ),

                    view(
                        "h2",
                        {
                            acquisitionSource:
                                "website",

                            currency:
                                "EUR",

                            acquisitionCostMinorUnits:
                                3000,

                            writtenPremiumMinorUnits:
                                180000,

                            paidCommissionMinorUnits:
                                14000
                        }
                    ),

                    view(
                        "h3",
                        {
                            acquisitionSource:
                                "referral",

                            currency:
                                "USD",

                            acquisitionCostMinorUnits:
                                0,

                            writtenPremiumMinorUnits:
                                120000,

                            paidCommissionMinorUnits:
                                10000
                        }
                    )
                ]
            });

        assert.equal(
            result.projectionVersion,
            "insurance-acquisition-aggregate-v1"
        );

        assert.equal(
            result.relationshipCount,
            3
        );

        assert.equal(
            result.buckets.length,
            2
        );

        const website =
            result.buckets.find(
                bucket =>
                    bucket.dimensionValue ===
                    "website"
            );

        assert.ok(
            website
        );

        assert.equal(
            website.relationshipCount,
            2
        );

        assert.equal(
            website.currencies.length,
            2
        );

        const eur =
            website.currencies.find(
                currency =>
                    currency.currency ===
                    "EUR"
            );

        const usd =
            website.currencies.find(
                currency =>
                    currency.currency ===
                    "USD"
            );

        assert.ok(
            eur
        );

        assert.ok(
            usd
        );

        assert.equal(
            eur.writtenPremiumMinorUnits,
            180000
        );

        assert.equal(
            eur.realizedCommissionMinorUnits,
            14000
        );

        assert.equal(
            eur.contributionMarginMinorUnits,
            11000
        );

        assert.equal(
            usd.writtenPremiumMinorUnits,
            220000
        );

        assert.equal(
            usd.realizedCommissionMinorUnits,
            16000
        );

        assert.equal(
            usd.contributionMarginMinorUnits,
            12000
        );
    }
);


test(
    "aggregates multiple relationships into the same campaign bucket",
    () => {
        const result =
            createInsuranceAcquisitionAggregateAnalytics({
                dimension:
                    "campaign",

                views: [
                    view(
                        "h4",
                        {
                            acquisitionSource:
                                "website",

                            campaign:
                                "West Texas Home",

                            acquisitionCostMinorUnits:
                                2500,

                            writtenPremiumMinorUnits:
                                100000,

                            paidCommissionMinorUnits:
                                9000
                        }
                    ),

                    view(
                        "h5",
                        {
                            acquisitionSource:
                                "website",

                            campaign:
                                "West Texas Home",

                            acquisitionCostMinorUnits:
                                3500,

                            writtenPremiumMinorUnits:
                                150000,

                            paidCommissionMinorUnits:
                                11000
                        }
                    )
                ]
            });

        assert.equal(
            result.buckets.length,
            1
        );

        const bucket =
            result.buckets[0]!;

        assert.equal(
            bucket.dimensionValue,
            "West Texas Home"
        );

        assert.equal(
            bucket.relationshipCount,
            2
        );

        const usd =
            bucket.currencies[0]!;

        assert.equal(
            usd.acquisitionCostMinorUnits,
            6000
        );

        assert.equal(
            usd.writtenPremiumMinorUnits,
            250000
        );

        assert.equal(
            usd.realizedCommissionMinorUnits,
            20000
        );

        assert.equal(
            usd.contributionMarginMinorUnits,
            14000
        );
    }
);


test(
    "preserves missing presentation dimension as an unlabeled bucket",
    () => {
        const result =
            createInsuranceAcquisitionAggregateAnalytics({
                dimension:
                    "campaign",

                views: [
                    view(
                        "h6",
                        {
                            includePresentation:
                                false,

                            paidCommissionMinorUnits:
                                5000
                        }
                    )
                ]
            });

        assert.equal(
            result.buckets.length,
            1
        );

        assert.equal(
            result.buckets[0]!.dimensionValue,
            undefined
        );

        assert.equal(
            result.buckets[0]!.relationshipCount,
            1
        );
    }
);


test(
    "rejects duplicate relationship inputs instead of double counting",
    () => {
        const value =
            view(
                "h7",
                {
                    acquisitionSource:
                        "website"
                }
            );

        assert.throws(
            () =>
                createInsuranceAcquisitionAggregateAnalytics({
                    dimension:
                        "acquisitionSource",

                    views: [
                        value,
                        value
                    ]
                }),
            /duplicate relationshipId/
        );
    }
);


test(
    "rejects analytics relationship mismatch",
    () => {
        const value =
            view(
                "h8",
                {
                    acquisitionSource:
                        "website"
                }
            );

        const mismatched:
            InsuranceAttributedRelationshipEconomicsView = {
                ...value,

                analytics: {
                    ...value.analytics,

                    relationshipId:
                        relationshipId(
                            "different"
                        )
                }
            };

        assert.throws(
            () =>
                createInsuranceAcquisitionAggregateAnalytics({
                    dimension:
                        "acquisitionSource",

                    views: [
                        mismatched
                    ]
                }),
            /analytics relationship mismatch/
        );
    }
);


test(
    "rejects unsupported aggregate dimension at runtime",
    () => {
        assert.throws(
            () =>
                createInsuranceAcquisitionAggregateAnalytics({
                    dimension:
                        "carrier" as
                            "acquisitionSource",

                    views:
                        []
                }),
            /dimension is not supported/
        );
    }
);
