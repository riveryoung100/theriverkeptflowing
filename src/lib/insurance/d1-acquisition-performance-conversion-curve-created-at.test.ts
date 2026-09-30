import assert from "node:assert/strict";
import test from "node:test";

import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";

import {
    createInsuranceAcquisitionCostFact
} from "./acquisition-economics";

import {
    createInsuranceAcquisitionOutcomeFact
} from "./acquisition-outcomes";

import type {
    InsuranceLeadPresentation
} from "./lead-presentation";

import {
    INSURANCE_ACQUISITION_RAW_EVIDENCE_BATCH_VERSION
} from "./d1-acquisition-raw-evidence-batch";

import type {
    InsuranceAcquisitionRawEvidenceBatch,
    InsuranceAcquisitionRawEvidenceBatchApplication
} from "./d1-acquisition-raw-evidence-batch";

import {
    createInsuranceAcquisitionCreatedAtConversionCurveApplication,
    INSURANCE_ACQUISITION_CREATED_AT_CONVERSION_CURVE_VERSION
} from "./d1-acquisition-performance-conversion-curve-created-at";

import type {
    InsuranceAcquisitionCreatedAtConversionCurveCohortReader
} from "./d1-acquisition-performance-conversion-curve-created-at";


const relationshipOne =
    "relationship:ins-004s-a" as RiverCrmRelationshipId;

const relationshipTwo =
    "relationship:ins-004s-b" as RiverCrmRelationshipId;


function emptyEvidence(
    relationshipIds:
        readonly RiverCrmRelationshipId[]
): InsuranceAcquisitionRawEvidenceBatch {
    return {
        projectionVersion:
            INSURANCE_ACQUISITION_RAW_EVIDENCE_BATCH_VERSION,

        relationshipIds,

        presentations:
            [],

        acquisitionCosts:
            [],

        premiumFacts:
            [],

        commissionFacts:
            [],

        renewalFacts:
            [],

        outcomeFacts:
            []
    };
}


class RecordingCohortReader
implements InsuranceAcquisitionCreatedAtConversionCurveCohortReader {
    calls =
        0;

    query:
        unknown;

    constructor(
        readonly relationships:
            readonly {
                readonly relationshipId:
                    string;

                readonly createdAt:
                    string;
            }[]
    ){}

    async listCreatedAtRangePage(
        query:
            Parameters<
                InsuranceAcquisitionCreatedAtConversionCurveCohortReader[
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


class RecordingRawEvidenceApplication
implements InsuranceAcquisitionRawEvidenceBatchApplication {
    calls =
        0;

    relationshipIds:
        readonly RiverCrmRelationshipId[] | undefined;

    evidence:
        InsuranceAcquisitionRawEvidenceBatch | undefined;

    async getEvidence(
        relationshipIds:
            readonly RiverCrmRelationshipId[]
    ){
        this.calls +=
            1;

        this.relationshipIds =
            relationshipIds;

        return this.evidence ??
            emptyEvidence(
                relationshipIds
            );
    }
}


test(
    "loads one cohort and one raw evidence batch for multiple observation windows",
    async () => {
        const cohortReader =
            new RecordingCohortReader([
                {
                    relationshipId:
                        relationshipOne,

                    createdAt:
                        "2026-08-01T00:00:00.000Z"
                },
                {
                    relationshipId:
                        relationshipTwo,

                    createdAt:
                        "2026-09-15T00:00:00.000Z"
                }
            ]);

        const rawEvidenceApplication =
            new RecordingRawEvidenceApplication();

        const application =
            createInsuranceAcquisitionCreatedAtConversionCurveApplication(
                cohortReader,
                rawEvidenceApplication
            );

        const result =
            await application
                .getCreatedAtConversionCurve({
                    createdAtFromInclusive:
                        "2026-08-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    asOfExclusive:
                        "2026-10-01T00:00:00.000Z",

                    windowDays: [
                        30,
                        7,
                        30
                    ],

                    dimensions: [
                        "state",
                        "state"
                    ],

                    limit:
                        50
                });

        assert.equal(
            cohortReader.calls,
            1
        );

        assert.equal(
            rawEvidenceApplication.calls,
            1
        );

        assert.deepEqual(
            rawEvidenceApplication.relationshipIds,
            [
                relationshipOne,
                relationshipTwo
            ]
        );

        assert.equal(
            result.version,
            INSURANCE_ACQUISITION_CREATED_AT_CONVERSION_CURVE_VERSION
        );

        assert.equal(
            result.asOfExclusive,
            "2026-10-01T00:00:00.000Z"
        );

        assert.equal(
            result.cohortRelationshipCount,
            2
        );

        assert.deepEqual(
            result.windows.map(
                window =>
                    window.windowDays
            ),
            [
                30,
                7
            ]
        );

        assert.equal(
            result.windows[0]
                ?.matureRelationshipCount,
            1
        );

        assert.equal(
            result.windows[0]
                ?.immatureRelationshipCount,
            1
        );

        assert.equal(
            result.windows[1]
                ?.matureRelationshipCount,
            2
        );

        assert.equal(
            result.windows[1]
                ?.immatureRelationshipCount,
            0
        );

        assert.deepEqual(
            result.windows.map(
                window =>
                    window.overall.relationshipCount
            ),
            [
                1,
                2
            ]
        );

        assert.deepEqual(
            result.windows.map(
                window =>
                    window.dimensions.map(
                        dimension =>
                            dimension.dimension
                    )
            ),
            [
                [
                    "state"
                ],
                [
                    "state"
                ]
            ]
        );
    }
);


test(
    "produces exact quote and bind conversion curves without floating point rates",
    async () => {
        const rawEvidenceApplication =
            new RecordingRawEvidenceApplication();

        rawEvidenceApplication.evidence = {
            projectionVersion:
                INSURANCE_ACQUISITION_RAW_EVIDENCE_BATCH_VERSION,

            relationshipIds: [
                relationshipOne,
                relationshipTwo
            ],

            presentations: [
                {
                    relationshipId:
                        relationshipOne,

                    state:
                        "TX",

                    postalCode:
                        "79720",

                    productInterest:
                        "auto",

                    quoteStatus:
                        "bound",

                    acquisitionSource:
                        "google",

                    consentChannels:
                        [],

                    doNotContact:
                        false,

                    recentEvents:
                        []
                } as InsuranceLeadPresentation,

                {
                    relationshipId:
                        relationshipTwo,

                    state:
                        "TX",

                    postalCode:
                        "79721",

                    productInterest:
                        "auto",

                    quoteStatus:
                        "quoted",

                    acquisitionSource:
                        "google",

                    consentChannels:
                        [],

                    doNotContact:
                        false,

                    recentEvents:
                        []
                } as InsuranceLeadPresentation
            ],

            acquisitionCosts: [
                createInsuranceAcquisitionCostFact({
                    costId:
                        "acquisition-cost:ins-004s-one",

                    relationshipId:
                        relationshipOne,

                    category:
                        "advertising",

                    money: {
                        amountMinorUnits:
                            1000,

                        currency:
                            "USD"
                    },

                    occurredAt:
                        "2026-08-01T00:00:00.000Z"
                }),

                createInsuranceAcquisitionCostFact({
                    costId:
                        "acquisition-cost:ins-004s-two",

                    relationshipId:
                        relationshipTwo,

                    category:
                        "advertising",

                    money: {
                        amountMinorUnits:
                            1200,

                        currency:
                            "USD"
                    },

                    occurredAt:
                        "2026-09-15T00:00:00.000Z"
                })
            ],

            premiumFacts:
                [],

            commissionFacts:
                [],

            renewalFacts:
                [],

            outcomeFacts: [
                createInsuranceAcquisitionOutcomeFact({
                    outcomeFactId:
                        "outcome-fact:ins-004s-one-quote",

                    relationshipId:
                        relationshipOne,

                    kind:
                        "quoted",

                    occurredAt:
                        "2026-08-04T00:00:00.000Z"
                }),

                createInsuranceAcquisitionOutcomeFact({
                    outcomeFactId:
                        "outcome-fact:ins-004s-one-bind",

                    relationshipId:
                        relationshipOne,

                    kind:
                        "bound",

                    occurredAt:
                        "2026-08-21T00:00:00.000Z"
                }),

                createInsuranceAcquisitionOutcomeFact({
                    outcomeFactId:
                        "outcome-fact:ins-004s-two-quote",

                    relationshipId:
                        relationshipTwo,

                    kind:
                        "quoted",

                    occurredAt:
                        "2026-09-19T00:00:00.000Z"
                })
            ]
        };

        const application =
            createInsuranceAcquisitionCreatedAtConversionCurveApplication(
                new RecordingCohortReader([
                    {
                        relationshipId:
                            relationshipOne,

                        createdAt:
                            "2026-08-01T00:00:00.000Z"
                    },
                    {
                        relationshipId:
                            relationshipTwo,

                        createdAt:
                            "2026-09-15T00:00:00.000Z"
                    }
                ]),
                rawEvidenceApplication
            );

        const result =
            await application
                .getCreatedAtConversionCurve({
                    createdAtFromInclusive:
                        "2026-08-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    asOfExclusive:
                        "2026-10-01T00:00:00.000Z",

                    windowDays: [
                        7,
                        30
                    ],

                    dimensions: [
                        "acquisitionSource"
                    ]
                });

        assert.deepEqual(
            result.windows[0]
                ?.overall
                .rates
                .quoteRate,
            {
                numerator:
                    2,

                denominator:
                    2
            }
        );

        assert.deepEqual(
            result.windows[0]
                ?.overall
                .rates
                .bindRate,
            {
                numerator:
                    0,

                denominator:
                    2
            }
        );

        assert.deepEqual(
            result.windows[1]
                ?.overall
                .rates
                .quoteRate,
            {
                numerator:
                    1,

                denominator:
                    1
            }
        );

        assert.deepEqual(
            result.windows[1]
                ?.overall
                .rates
                .bindRate,
            {
                numerator:
                    1,

                denominator:
                    1
            }
        );

        const sevenDayBucket =
            result.windows[0]
                ?.dimensions[0]
                ?.outcomes
                .buckets[0];

        assert.equal(
            result.windows[0]
                ?.matureRelationshipCount,
            2
        );

        assert.deepEqual(
            sevenDayBucket?.quoteRate,
            {
                numerator:
                    2,

                denominator:
                    2
            }
        );

        assert.deepEqual(
            sevenDayBucket?.bindRate,
            {
                numerator:
                    0,

                denominator:
                    2
            }
        );

        const thirtyDayBucket =
            result.windows[1]
                ?.dimensions[0]
                ?.outcomes
                .buckets[0];

        assert.equal(
            result.windows[1]
                ?.matureRelationshipCount,
            1
        );

        assert.deepEqual(
            thirtyDayBucket?.quoteRate,
            {
                numerator:
                    1,

                denominator:
                    1
            }
        );

        assert.deepEqual(
            thirtyDayBucket?.bindRate,
            {
                numerator:
                    1,

                denominator:
                    1
            }
        );
    }
);


test(
    "rejects invalid windows before cohort or raw evidence access",
    async () => {
        const cohortReader =
            new RecordingCohortReader(
                []
            );

        const rawEvidenceApplication =
            new RecordingRawEvidenceApplication();

        const application =
            createInsuranceAcquisitionCreatedAtConversionCurveApplication(
                cohortReader,
                rawEvidenceApplication
            );

        await assert.rejects(
            application
                .getCreatedAtConversionCurve({
                    createdAtFromInclusive:
                        "2026-08-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    asOfExclusive:
                        "2026-10-01T00:00:00.000Z",

                    windowDays: [
                        7,
                        0
                    ],

                    dimensions: [
                        "state"
                    ]
                }),
            /positive safe integer/
        );

        assert.equal(
            cohortReader.calls,
            0
        );

        assert.equal(
            rawEvidenceApplication.calls,
            0
        );
    }
);


test(
    "rejects an empty observation-window request before persistence access",
    async () => {
        const cohortReader =
            new RecordingCohortReader(
                []
            );

        const rawEvidenceApplication =
            new RecordingRawEvidenceApplication();

        const application =
            createInsuranceAcquisitionCreatedAtConversionCurveApplication(
                cohortReader,
                rawEvidenceApplication
            );

        await assert.rejects(
            application
                .getCreatedAtConversionCurve({
                    createdAtFromInclusive:
                        "2026-08-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    asOfExclusive:
                        "2026-10-01T00:00:00.000Z",

                    windowDays:
                        [],

                    dimensions: [
                        "state"
                    ]
                }),
            /at least one observation window/
        );

        assert.equal(
            cohortReader.calls,
            0
        );

        assert.equal(
            rawEvidenceApplication.calls,
            0
        );
    }
);


test(
    "unsupported dimension fails before cohort or raw evidence access",
    async () => {
        const cohortReader =
            new RecordingCohortReader(
                []
            );

        const rawEvidenceApplication =
            new RecordingRawEvidenceApplication();

        const application =
            createInsuranceAcquisitionCreatedAtConversionCurveApplication(
                cohortReader,
                rawEvidenceApplication
            );

        await assert.rejects(
            application
                .getCreatedAtConversionCurve({
                    createdAtFromInclusive:
                        "2026-08-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    asOfExclusive:
                        "2026-10-01T00:00:00.000Z",

                    windowDays: [
                        7
                    ],

                    dimensions: [
                        "not-a-dimension"
                    ] as never
                }),
            /dimension/
        );

        assert.equal(
            cohortReader.calls,
            0
        );

        assert.equal(
            rawEvidenceApplication.calls,
            0
        );
    }
);


test(
    "empty created-at cohort loads one zero-read raw batch and returns zero projections for every window",
    async () => {
        const cohortReader =
            new RecordingCohortReader(
                []
            );

        const rawEvidenceApplication =
            new RecordingRawEvidenceApplication();

        const application =
            createInsuranceAcquisitionCreatedAtConversionCurveApplication(
                cohortReader,
                rawEvidenceApplication
            );

        const result =
            await application
                .getCreatedAtConversionCurve({
                    createdAtFromInclusive:
                        "2026-08-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-09-01T00:00:00.000Z",

                    asOfExclusive:
                        "2026-10-01T00:00:00.000Z",

                    windowDays: [
                        7,
                        30
                    ],

                    dimensions: [
                        "state"
                    ]
                });

        assert.equal(
            cohortReader.calls,
            1
        );

        assert.equal(
            rawEvidenceApplication.calls,
            1
        );

        assert.deepEqual(
            rawEvidenceApplication.relationshipIds,
            []
        );

        assert.equal(
            result.cohortRelationshipCount,
            0
        );

        assert.equal(
            result.windows.length,
            2
        );

        for(const window of result.windows){
            assert.equal(
                window.matureRelationshipCount,
                0
            );

            assert.equal(
                window.immatureRelationshipCount,
                0
            );

            assert.equal(
                window.overall.relationshipCount,
                0
            );

            assert.deepEqual(
                window.overall.currencies,
                []
            );

            assert.equal(
                window.dimensions[0]
                    ?.economics
                    .relationshipCount,
                0
            );

            assert.equal(
                window.dimensions[0]
                    ?.outcomes
                    .relationshipCount,
                0
            );
        }
    }
);

test(
    "projects explicit limited cohort metadata once for the full conversion curve",
    async () => {
        const cohortReader =
            new RecordingCohortReader(
                []
            );

        const rawEvidenceApplication =
            new RecordingRawEvidenceApplication();

        const application =
            createInsuranceAcquisitionCreatedAtConversionCurveApplication(
                cohortReader,
                rawEvidenceApplication
            );

        const result =
            await application
                .getCreatedAtConversionCurve({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    asOfExclusive:
                        "2026-11-15T00:00:00.000Z",

                    windowDays: [
                        7,
                        30
                    ],

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
            result.cohortRelationshipCount,
            0
        );

        assert.equal(
            result.windows.length,
            2
        );

        assert.equal(
            rawEvidenceApplication.calls,
            1
        );
    }
);
