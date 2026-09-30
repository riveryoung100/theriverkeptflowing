import assert from "node:assert/strict";
import test from "node:test";

import {
    INSURANCE_ACQUISITION_ANALYTICS_PROJECTION_VERSION
} from "./acquisition-analytics";

import {
    createInsuranceAcquisitionPerformanceSnapshotApplication,
    INSURANCE_ACQUISITION_PERFORMANCE_SNAPSHOT_VERSION
} from "./d1-acquisition-performance-snapshot-created-at-cohort";

import type {
    InsuranceAcquisitionPerformanceSnapshotCohortReader,
    InsuranceAcquisitionPerformanceSnapshotOutcomeReader
} from "./d1-acquisition-performance-snapshot-created-at-cohort";

import type {
    InsuranceAttributedEconomicsBatchApplication
} from "./d1-attributed-economics-batch";


class RecordingCohortReader
implements InsuranceAcquisitionPerformanceSnapshotCohortReader {
    calls =
        0;

    query:
        unknown;

    constructor(
        private readonly relationships:
            readonly {
                readonly relationshipId:
                    string;
            }[]
    ){}

    async listCreatedAtRangePage(
        query:
            Parameters<
                InsuranceAcquisitionPerformanceSnapshotCohortReader[
                    "listCreatedAtRangePage"
                ]
            >[0]
    ){
        this.calls +=
            1;

        this.query = {
            createdAtFromInclusive:
                query.createdAtFromInclusive,

            createdAtToExclusive:
                query.createdAtToExclusive,

            ...(query.pageSize === 100
                ? {}
                : {
                    limit:
                        query.pageSize
                })
        };

        return {
            relationships:
                this.relationships.map(
                    relationship => ({
                        ...relationship,

                        createdAt:
                            "createdAt" in relationship &&
                            typeof relationship.createdAt === "string"
                                ? relationship.createdAt
                                : query.createdAtFromInclusive
                    })
                ),

            hasMore:
                false
        };
    }
}


class RecordingViewsApplication
implements InsuranceAttributedEconomicsBatchApplication {
    calls =
        0;

    relationshipIds:
        readonly string[] | undefined;

    async getViews(
        relationshipIds:
            Parameters<
                InsuranceAttributedEconomicsBatchApplication[
                    "getViews"
                ]
            >[0]
    ){
        this.calls +=
            1;

        this.relationshipIds =
            relationshipIds;

        return relationshipIds.map(
            (
                relationshipId,
                index
            ) => ({
                relationshipId,

                analytics: {
                    projectionVersion:
                        INSURANCE_ACQUISITION_ANALYTICS_PROJECTION_VERSION,

                    relationshipId,

                    currencies: [
                        {
                            currency:
                                "USD",

                            acquisitionCostMinorUnits:
                                index === 0
                                    ? 1000
                                    : 500,

                            quotedPremiumMinorUnits:
                                index === 0
                                    ? 250000
                                    : 150000,

                            writtenPremiumMinorUnits:
                                index === 0
                                    ? 250000
                                    : 0,

                            renewalPremiumMinorUnits:
                                0,

                            earnedCommissionMinorUnits:
                                index === 0
                                    ? 25000
                                    : 0,

                            paidCommissionMinorUnits:
                                index === 0
                                    ? 25000
                                    : 0,

                            chargebackMinorUnits:
                                0,

                            adjustmentMinorUnits:
                                0,

                            realizedCommissionMinorUnits:
                                index === 0
                                    ? 25000
                                    : 0,

                            contributionMarginMinorUnits:
                                index === 0
                                    ? 24000
                                    : -500
                        }
                    ],

                    renewalFactCount:
                        0
                },

                presentation: {
                    relationshipId,

                    state:
                        index === 0
                            ? "TX"
                            : "NM",

                    postalCode:
                        index === 0
                            ? "79720"
                            : "88220",

                    productInterest:
                        index === 0
                            ? "auto"
                            : "home",

                    quoteStatus:
                        index === 0
                            ? "quoted"
                            : "not-started",

                    acquisitionSource:
                        index === 0
                            ? "google"
                            : "referral",

                    campaign:
                        "fall-2026",

                    consentChannels:
                        [],

                    doNotContact:
                        false,

                    recentEvents:
                        []
                }
            })
        ) as never;
    }
}


class RecordingOutcomeReader
implements InsuranceAcquisitionPerformanceSnapshotOutcomeReader {
    calls =
        0;

    relationshipIds:
        readonly string[] | undefined;

    facts:
        readonly unknown[] =
            [];

    async listForRelationships(
        relationshipIds:
            Parameters<
                InsuranceAcquisitionPerformanceSnapshotOutcomeReader[
                    "listForRelationships"
                ]
            >[0]
    ){
        this.calls +=
            1;

        this.relationshipIds =
            relationshipIds;

        return this.facts as never;
    }
}


function fact(
    suffix:
        string,
    relationshipId:
        string,
    kind:
        "quoted" | "bound"
){
    return {
        outcomeFactId:
            `outcome-fact:${suffix}`,

        relationshipId,

        kind,

        occurredAt:
            "2026-09-15T12:00:00.000Z"
    };
}


test(
    "resolves created cohort once loads shared evidence once and derives all performance families",
    async () => {
        const cohortReader =
            new RecordingCohortReader([
                {
                    relationshipId:
                        "relationship:ins-004j-a"
                },
                {
                    relationshipId:
                        "relationship:ins-004j-b"
                }
            ]);

        const viewsApplication =
            new RecordingViewsApplication();

        const outcomeReader =
            new RecordingOutcomeReader();

        outcomeReader.facts = [
            fact(
                "ins-004j-a-quoted",
                "relationship:ins-004j-a",
                "quoted"
            ),
            fact(
                "ins-004j-a-bound",
                "relationship:ins-004j-a",
                "bound"
            ),
            fact(
                "ins-004j-b-quoted",
                "relationship:ins-004j-b",
                "quoted"
            )
        ];

        const application =
            createInsuranceAcquisitionPerformanceSnapshotApplication(
                cohortReader,
                viewsApplication,
                outcomeReader
            );

        const result =
            await application
                .getCreatedAtSnapshot({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    limit:
                        25,

                    dimensions: [
                        "acquisitionSource",
                        "campaign",
                        "state"
                    ]
                });

        assert.equal(
            cohortReader.calls,
            1
        );

        assert.equal(
            viewsApplication.calls,
            1
        );

        assert.equal(
            outcomeReader.calls,
            1
        );

        assert.deepEqual(
            viewsApplication.relationshipIds,
            [
                "relationship:ins-004j-a",
                "relationship:ins-004j-b"
            ]
        );

        assert.deepEqual(
            outcomeReader.relationshipIds,
            viewsApplication.relationshipIds
        );

        assert.equal(
            result.version,
            INSURANCE_ACQUISITION_PERFORMANCE_SNAPSHOT_VERSION
        );

        assert.equal(
            result.relationshipCount,
            2
        );

        assert.equal(
            result.overall.relationshipCount,
            2
        );

        assert.equal(
            result.overall.outcomes.quotedRelationshipCount,
            2
        );

        assert.equal(
            result.overall.outcomes.boundRelationshipCount,
            1
        );

        assert.deepEqual(
            result.overall.rates.quoteRate,
            {
                numerator:
                    2,

                denominator:
                    2
            }
        );

        assert.deepEqual(
            result.overall.rates.bindRate,
            {
                numerator:
                    1,

                denominator:
                    2
            }
        );

        assert.deepEqual(
            result.dimensions.map(
                projection =>
                    projection.dimension
            ),
            [
                "acquisitionSource",
                "campaign",
                "state"
            ]
        );

        const campaign =
            result.dimensions[1];

        assert.equal(
            campaign
                ?.economics.relationshipCount,
            2
        );

        assert.equal(
            campaign
                ?.outcomes
                .buckets[0]
                ?.quotedRelationshipCount,
            2
        );

        assert.equal(
            campaign
                ?.outcomes
                .buckets[0]
                ?.boundRelationshipCount,
            1
        );

        assert.deepEqual(
            campaign
                ?.costPerOutcome
                .buckets[0]
                ?.currencies[0]
                ?.costPerQuote,
            {
                numeratorMinorUnits:
                    1500,

                denominatorCount:
                    2
            }
        );

        assert.deepEqual(
            campaign
                ?.costPerOutcome
                .buckets[0]
                ?.currencies[0]
                ?.costPerBind,
            {
                numeratorMinorUnits:
                    1500,

                denominatorCount:
                    1
            }
        );
    }
);


test(
    "deduplicates CRM relationship identities and requested dimensions while preserving first occurrence order",
    async () => {
        const cohortReader =
            new RecordingCohortReader([
                {
                    relationshipId:
                        "relationship:ins-004j-a"
                },
                {
                    relationshipId:
                        "relationship:ins-004j-a"
                },
                {
                    relationshipId:
                        "relationship:ins-004j-b"
                }
            ]);

        const viewsApplication =
            new RecordingViewsApplication();

        const outcomeReader =
            new RecordingOutcomeReader();

        const application =
            createInsuranceAcquisitionPerformanceSnapshotApplication(
                cohortReader,
                viewsApplication,
                outcomeReader
            );

        const result =
            await application
                .getCreatedAtSnapshot({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    dimensions: [
                        "state",
                        "campaign",
                        "state",
                        "productInterest",
                        "campaign"
                    ]
                });

        assert.deepEqual(
            viewsApplication.relationshipIds,
            [
                "relationship:ins-004j-a",
                "relationship:ins-004j-b"
            ]
        );

        assert.deepEqual(
            result.dimensions.map(
                projection =>
                    projection.dimension
            ),
            [
                "state",
                "campaign",
                "productInterest"
            ]
        );
    }
);


test(
    "empty created cohort performs zero evidence reads but returns requested zero projections",
    async () => {
        const cohortReader =
            new RecordingCohortReader(
                []
            );

        const viewsApplication =
            new RecordingViewsApplication();

        const outcomeReader =
            new RecordingOutcomeReader();

        const application =
            createInsuranceAcquisitionPerformanceSnapshotApplication(
                cohortReader,
                viewsApplication,
                outcomeReader
            );

        const result =
            await application
                .getCreatedAtSnapshot({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    dimensions: [
                        "state",
                        "campaign"
                    ]
                });

        assert.equal(
            cohortReader.calls,
            1
        );

        assert.equal(
            viewsApplication.calls,
            0
        );

        assert.equal(
            outcomeReader.calls,
            0
        );

        assert.equal(
            result.relationshipCount,
            0
        );

        assert.equal(
            result.overall.relationshipCount,
            0
        );

        assert.deepEqual(
            result.overall.currencies,
            []
        );

        assert.equal(
            result.overall.outcomes.relationshipCount,
            0
        );

        assert.equal(
            "quoteRate" in result.overall.rates,
            false
        );

        assert.equal(
            "bindRate" in result.overall.rates,
            false
        );

        assert.deepEqual(
            result.dimensions.map(
                projection => ({
                    dimension:
                        projection.dimension,

                    economicsCount:
                        projection.economics.relationshipCount,

                    outcomeCount:
                        projection.outcomes.relationshipCount,

                    costCount:
                        projection.costPerOutcome.relationshipCount
                })
            ),
            [
                {
                    dimension:
                        "state",

                    economicsCount:
                        0,

                    outcomeCount:
                        0,

                    costCount:
                        0
                },
                {
                    dimension:
                        "campaign",

                    economicsCount:
                        0,

                    outcomeCount:
                        0,

                    costCount:
                        0
                }
            ]
        );
    }
);


test(
    "unsupported dimension fails before any persistence read",
    async () => {
        const cohortReader =
            new RecordingCohortReader(
                []
            );

        const viewsApplication =
            new RecordingViewsApplication();

        const outcomeReader =
            new RecordingOutcomeReader();

        const application =
            createInsuranceAcquisitionPerformanceSnapshotApplication(
                cohortReader,
                viewsApplication,
                outcomeReader
            );

        await assert.rejects(
            application
                .getCreatedAtSnapshot({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    dimensions: [
                        "not-a-dimension"
                    ] as never
                }),
            /unsupported dimension/
        );

        assert.equal(
            cohortReader.calls,
            0
        );

        assert.equal(
            viewsApplication.calls,
            0
        );

        assert.equal(
            outcomeReader.calls,
            0
        );
    }
);


test(
    "malformed CRM relationship identity fails before evidence reads",
    async () => {
        const cohortReader =
            new RecordingCohortReader([
                {
                    relationshipId:
                        "lead:not-a-relationship"
                }
            ]);

        const viewsApplication =
            new RecordingViewsApplication();

        const outcomeReader =
            new RecordingOutcomeReader();

        const application =
            createInsuranceAcquisitionPerformanceSnapshotApplication(
                cohortReader,
                viewsApplication,
                outcomeReader
            );

        await assert.rejects(
            application
                .getCreatedAtSnapshot({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    dimensions: [
                        "state"
                    ]
                }),
            /relationship/
        );

        assert.equal(
            cohortReader.calls,
            1
        );

        assert.equal(
            viewsApplication.calls,
            0
        );

        assert.equal(
            outcomeReader.calls,
            0
        );
    }
);


test(
    "preserves CRM-owned query strings and omitted limit",
    async () => {
        const cohortReader =
            new RecordingCohortReader(
                []
            );

        const viewsApplication =
            new RecordingViewsApplication();

        const outcomeReader =
            new RecordingOutcomeReader();

        const application =
            createInsuranceAcquisitionPerformanceSnapshotApplication(
                cohortReader,
                viewsApplication,
                outcomeReader
            );

        await application
            .getCreatedAtSnapshot({
                createdAtFromInclusive:
                    "2026-09-01T00:00:00.000Z",

                createdAtToExclusive:
                    "2026-10-01T00:00:00.000Z",

                dimensions:
                    []
            });

        assert.deepEqual(
            cohortReader.query,
            {
                createdAtFromInclusive:
                    "2026-09-01T00:00:00.000Z",

                createdAtToExclusive:
                    "2026-10-01T00:00:00.000Z"
            }
        );
    }
);


test(
    "bound-only durable evidence remains bound-only in combined outcome and cost projections",
    async () => {
        const cohortReader =
            new RecordingCohortReader([
                {
                    relationshipId:
                        "relationship:ins-004j-a"
                }
            ]);

        const viewsApplication =
            new RecordingViewsApplication();

        const outcomeReader =
            new RecordingOutcomeReader();

        outcomeReader.facts = [
            fact(
                "ins-004j-a-bound",
                "relationship:ins-004j-a",
                "bound"
            )
        ];

        const application =
            createInsuranceAcquisitionPerformanceSnapshotApplication(
                cohortReader,
                viewsApplication,
                outcomeReader
            );

        const result =
            await application
                .getCreatedAtSnapshot({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    dimensions: [
                        "quoteStatus"
                    ]
                });

        const projection =
            result.dimensions[0];

        assert.equal(
            projection
                ?.outcomes
                .buckets[0]
                ?.quotedRelationshipCount,
            0
        );

        assert.equal(
            projection
                ?.outcomes
                .buckets[0]
                ?.boundRelationshipCount,
            1
        );

        assert.equal(
            projection
                ?.costPerOutcome
                .buckets[0]
                ?.currencies[0]
                ?.costPerQuote,
            undefined
        );

        assert.deepEqual(
            projection
                ?.costPerOutcome
                .buckets[0]
                ?.currencies[0]
                ?.costPerBind,
            {
                numeratorMinorUnits:
                    1000,

                denominatorCount:
                    1
            }
        );
    }
);

test(
    "derives overall and dimension return efficiency without additional persistence reads",
    async () => {
        const cohortReader =
            new RecordingCohortReader([
                {
                    relationshipId:
                        "relationship:ins-004w-a"
                },
                {
                    relationshipId:
                        "relationship:ins-004w-b"
                }
            ]);

        const viewsApplication =
            new RecordingViewsApplication();

        const outcomeReader =
            new RecordingOutcomeReader();

        const application =
            createInsuranceAcquisitionPerformanceSnapshotApplication(
                cohortReader,
                viewsApplication,
                outcomeReader
            );

        const result =
            await application
                .getCreatedAtSnapshot({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    dimensions: [
                        "campaign"
                    ]
                });

        assert.equal(
            cohortReader.calls,
            1
        );

        assert.equal(
            viewsApplication.calls,
            1
        );

        assert.equal(
            outcomeReader.calls,
            1
        );

        assert.equal(
            result.overall.returnEfficiency.currencies.length,
            result.overall.currencies.length
        );

        for(
            let index = 0;
            index < result.overall.currencies.length;
            index++
        ){
            const economicsCurrency =
                result.overall.currencies[index];

            const returnCurrency =
                result.overall.returnEfficiency.currencies[index];

            assert.ok(
                economicsCurrency
            );

            assert.ok(
                returnCurrency
            );

            assert.equal(
                returnCurrency.currency,
                economicsCurrency.currency
            );

            assert.equal(
                returnCurrency.acquisitionCostMinorUnits,
                economicsCurrency.acquisitionCostMinorUnits
            );

            assert.equal(
                returnCurrency.realizedCommissionMinorUnits,
                economicsCurrency.realizedCommissionMinorUnits
            );

            assert.equal(
                returnCurrency.contributionMarginMinorUnits,
                economicsCurrency.contributionMarginMinorUnits
            );

            if(economicsCurrency.acquisitionCostMinorUnits === 0){
                assert.equal(
                    "realizedCommissionToAcquisitionCost" in returnCurrency,
                    false
                );

                assert.equal(
                    "contributionToAcquisitionCost" in returnCurrency,
                    false
                );
            }
            else {
                assert.deepEqual(
                    returnCurrency.realizedCommissionToAcquisitionCost,
                    {
                        numeratorMinorUnits:
                            economicsCurrency.realizedCommissionMinorUnits,

                        denominatorMinorUnits:
                            economicsCurrency.acquisitionCostMinorUnits
                    }
                );

                assert.deepEqual(
                    returnCurrency.contributionToAcquisitionCost,
                    {
                        numeratorMinorUnits:
                            economicsCurrency.contributionMarginMinorUnits,

                        denominatorMinorUnits:
                            economicsCurrency.acquisitionCostMinorUnits
                    }
                );
            }
        }

        const projection =
            result.dimensions[0];

        assert.ok(
            projection
        );

        assert.equal(
            projection.returnEfficiency.dimension,
            projection.economics.dimension
        );

        assert.equal(
            projection.returnEfficiency.relationshipCount,
            projection.economics.relationshipCount
        );

        assert.equal(
            projection.returnEfficiency.buckets.length,
            projection.economics.buckets.length
        );

        for(
            let bucketIndex = 0;
            bucketIndex < projection.economics.buckets.length;
            bucketIndex++
        ){
            const economicsBucket =
                projection.economics.buckets[bucketIndex];

            const returnBucket =
                projection.returnEfficiency.buckets[bucketIndex];

            assert.ok(
                economicsBucket
            );

            assert.ok(
                returnBucket
            );

            assert.equal(
                returnBucket.dimensionValue,
                economicsBucket.dimensionValue
            );

            assert.equal(
                returnBucket.relationshipCount,
                economicsBucket.relationshipCount
            );

            assert.equal(
                returnBucket.currencies.length,
                economicsBucket.currencies.length
            );

            for(
                let currencyIndex = 0;
                currencyIndex < economicsBucket.currencies.length;
                currencyIndex++
            ){
                const economicsCurrency =
                    economicsBucket.currencies[currencyIndex];

                const returnCurrency =
                    returnBucket.currencies[currencyIndex];

                assert.ok(
                    economicsCurrency
                );

                assert.ok(
                    returnCurrency
                );

                assert.equal(
                    returnCurrency.currency,
                    economicsCurrency.currency
                );

                assert.equal(
                    returnCurrency.acquisitionCostMinorUnits,
                    economicsCurrency.acquisitionCostMinorUnits
                );

                assert.equal(
                    returnCurrency.realizedCommissionMinorUnits,
                    economicsCurrency.realizedCommissionMinorUnits
                );

                assert.equal(
                    returnCurrency.contributionMarginMinorUnits,
                    economicsCurrency.contributionMarginMinorUnits
                );

                if(economicsCurrency.acquisitionCostMinorUnits === 0){
                    assert.equal(
                        "realizedCommissionToAcquisitionCost" in returnCurrency,
                        false
                    );

                    assert.equal(
                        "contributionToAcquisitionCost" in returnCurrency,
                        false
                    );
                }
                else {
                    assert.deepEqual(
                        returnCurrency.realizedCommissionToAcquisitionCost,
                        {
                            numeratorMinorUnits:
                                economicsCurrency.realizedCommissionMinorUnits,

                            denominatorMinorUnits:
                                economicsCurrency.acquisitionCostMinorUnits
                        }
                    );

                    assert.deepEqual(
                        returnCurrency.contributionToAcquisitionCost,
                        {
                            numeratorMinorUnits:
                                economicsCurrency.contributionMarginMinorUnits,

                            denominatorMinorUnits:
                                economicsCurrency.acquisitionCostMinorUnits
                        }
                    );
                }
            }
        }
    }
);


test(
    "empty created cohort inherits empty overall and dimension return efficiency without downstream reads",
    async () => {
        const cohortReader =
            new RecordingCohortReader(
                []
            );

        const viewsApplication =
            new RecordingViewsApplication();

        const outcomeReader =
            new RecordingOutcomeReader();

        const application =
            createInsuranceAcquisitionPerformanceSnapshotApplication(
                cohortReader,
                viewsApplication,
                outcomeReader
            );

        const result =
            await application
                .getCreatedAtSnapshot({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    dimensions: [
                        "state",
                        "campaign"
                    ]
                });

        assert.equal(
            cohortReader.calls,
            1
        );

        assert.equal(
            viewsApplication.calls,
            0
        );

        assert.equal(
            outcomeReader.calls,
            0
        );

        assert.deepEqual(
            result.overall.returnEfficiency.currencies,
            []
        );

        for(const projection of result.dimensions){
            assert.equal(
                projection.returnEfficiency.relationshipCount,
                0
            );

            assert.equal(
                projection.returnEfficiency.buckets.length,
                projection.economics.buckets.length
            );
        }
    }
);

test(
    "projects explicit limited cohort metadata before lifetime evidence loading",
    async () => {
        const cohortReader =
            new RecordingCohortReader(
                []
            );

        const viewsApplication =
            new RecordingViewsApplication();

        const outcomeReader =
            new RecordingOutcomeReader();

        const application =
            createInsuranceAcquisitionPerformanceSnapshotApplication(
                cohortReader,
                viewsApplication,
                outcomeReader
            );

        const result =
            await application
                .getCreatedAtSnapshot({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    limit:
                        5,

                    dimensions: [
                        "state"
                    ]
                });

        assert.deepEqual(
            result.cohort,
            {
                selection:
                    "limited",

                relationshipCount:
                    0,

                pageCount:
                    1,

                isComplete:
                    true,

                isTruncated:
                    false,

                requestedLimit:
                    5
            }
        );

        assert.equal(
            result.relationshipCount,
            0
        );

        assert.equal(
            viewsApplication.calls,
            0
        );

        assert.equal(
            outcomeReader.calls,
            0
        );
    }
);
