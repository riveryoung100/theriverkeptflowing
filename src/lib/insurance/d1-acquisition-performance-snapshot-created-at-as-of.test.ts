import assert from "node:assert/strict";
import test from "node:test";

import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";

import {
    createInsuranceAcquisitionCostFact,
    createInsurancePremiumFact
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
    createInsuranceAcquisitionCreatedAtAsOfPerformanceSnapshotApplication,
    INSURANCE_ACQUISITION_CREATED_AT_AS_OF_PERFORMANCE_SNAPSHOT_VERSION
} from "./d1-acquisition-performance-snapshot-created-at-as-of";

import type {
    InsuranceCreatedAtAsOfPerformanceSnapshotCohortReader
} from "./d1-acquisition-performance-snapshot-created-at-as-of";


const relationshipOne =
    "relationship:ins-004n-a" as RiverCrmRelationshipId;

const relationshipTwo =
    "relationship:ins-004n-b" as RiverCrmRelationshipId;


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
implements InsuranceCreatedAtAsOfPerformanceSnapshotCohortReader {
    calls =
        0;

    query:
        unknown;

    constructor(
        readonly relationships:
            readonly {
                readonly relationshipId:
                    string;
            }[]
    ){}

    async listCreatedAtRangePage(
        query:
            Parameters<
                InsuranceCreatedAtAsOfPerformanceSnapshotCohortReader[
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
    "resolves created-at cohort once and loads one canonical raw evidence batch",
    async () => {
        const cohortReader =
            new RecordingCohortReader([
                {
                    relationshipId:
                        relationshipOne
                },
                {
                    relationshipId:
                        relationshipOne
                },
                {
                    relationshipId:
                        relationshipTwo
                }
            ]);

        const rawEvidenceApplication =
            new RecordingRawEvidenceApplication();

        const application =
            createInsuranceAcquisitionCreatedAtAsOfPerformanceSnapshotApplication(
                cohortReader,
                rawEvidenceApplication
            );

        const result =
            await application
                .getCreatedAtAsOfSnapshot({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    asOfExclusive:
                        "2026-10-01T00:00:00.000Z",

                    limit:
                        25,

                    dimensions: [
                        "campaign",
                        "campaign",
                        "state"
                    ]
                });

        assert.equal(
            cohortReader.calls,
            1
        );

        assert.deepEqual(
            cohortReader.query,
            {
                createdAtFromInclusive:
                    "2026-09-01T00:00:00.000Z",

                createdAtToExclusive:
                    "2026-10-01T00:00:00.000Z",

                limit:
                    25
            }
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
            INSURANCE_ACQUISITION_CREATED_AT_AS_OF_PERFORMANCE_SNAPSHOT_VERSION
        );

        assert.equal(
            result.asOfExclusive,
            "2026-10-01T00:00:00.000Z"
        );

        assert.equal(
            result.relationshipCount,
            2
        );

        assert.equal(
            result.overall.relationshipCount,
            2
        );

        assert.deepEqual(
            result.dimensions.map(
                projection =>
                    projection.dimension
            ),
            [
                "campaign",
                "state"
            ]
        );
    }
);


test(
    "uses one upper-exclusive cutoff for economics outcomes and cost per outcome",
    async () => {
        const boundary =
            "2026-10-01T00:00:00.000Z";

        const before =
            "2026-09-30T23:59:59.999Z";

        const rawEvidenceApplication =
            new RecordingRawEvidenceApplication();

        rawEvidenceApplication.evidence = {
            projectionVersion:
                INSURANCE_ACQUISITION_RAW_EVIDENCE_BATCH_VERSION,

            relationshipIds: [
                relationshipOne
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
                        "acquisition-cost:ins-004n-before",

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
                        before
                }),

                createInsuranceAcquisitionCostFact({
                    costId:
                        "acquisition-cost:ins-004n-boundary",

                    relationshipId:
                        relationshipOne,

                    category:
                        "advertising",

                    money: {
                        amountMinorUnits:
                            9000,

                        currency:
                            "USD"
                    },

                    occurredAt:
                        boundary
                })
            ],

            premiumFacts: [
                createInsurancePremiumFact({
                    premiumFactId:
                        "premium-fact:ins-004n-before",

                    relationshipId:
                        relationshipOne,

                    kind:
                        "written",

                    money: {
                        amountMinorUnits:
                            180000,

                        currency:
                            "USD"
                    },

                    occurredAt:
                        before
                }),

                createInsurancePremiumFact({
                    premiumFactId:
                        "premium-fact:ins-004n-boundary",

                    relationshipId:
                        relationshipOne,

                    kind:
                        "quoted",

                    money: {
                        amountMinorUnits:
                            250000,

                        currency:
                            "USD"
                    },

                    occurredAt:
                        boundary
                })
            ],

            commissionFacts:
                [],

            renewalFacts:
                [],

            outcomeFacts: [
                createInsuranceAcquisitionOutcomeFact({
                    outcomeFactId:
                        "outcome-fact:ins-004n-quoted-before",

                    relationshipId:
                        relationshipOne,

                    kind:
                        "quoted",

                    occurredAt:
                        before
                }),

                createInsuranceAcquisitionOutcomeFact({
                    outcomeFactId:
                        "outcome-fact:ins-004n-bound-boundary",

                    relationshipId:
                        relationshipOne,

                    kind:
                        "bound",

                    occurredAt:
                        boundary
                })
            ]
        };

        const application =
            createInsuranceAcquisitionCreatedAtAsOfPerformanceSnapshotApplication(
                new RecordingCohortReader([
                    {
                        relationshipId:
                            relationshipOne
                    }
                ]),
                rawEvidenceApplication
            );

        const result =
            await application
                .getCreatedAtAsOfSnapshot({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    asOfExclusive:
                        boundary,

                    dimensions: [
                        "acquisitionSource"
                    ]
                });

        const projection =
            result.dimensions[0];

        assert.equal(
            projection
                ?.economics
                .buckets[0]
                ?.currencies[0]
                ?.acquisitionCostMinorUnits,
            1000
        );

        assert.equal(
            projection
                ?.economics
                .buckets[0]
                ?.currencies[0]
                ?.writtenPremiumMinorUnits,
            180000
        );

        assert.equal(
            projection
                ?.economics
                .buckets[0]
                ?.currencies[0]
                ?.quotedPremiumMinorUnits,
            0
        );

        assert.equal(
            projection
                ?.outcomes
                .buckets[0]
                ?.quotedRelationshipCount,
            1
        );

        assert.equal(
            projection
                ?.outcomes
                .buckets[0]
                ?.boundRelationshipCount,
            0
        );

        assert.deepEqual(
            projection
                ?.costPerOutcome
                .buckets[0]
                ?.currencies[0]
                ?.costPerQuote,
            {
                numeratorMinorUnits:
                    1000,

                denominatorCount:
                    1
            }
        );

        assert.equal(
            projection
                ?.costPerOutcome
                .buckets[0]
                ?.currencies[0]
                ?.costPerBind,
            undefined
        );
    }
);


test(
    "uses current presentation only as segmentation metadata",
    async () => {
        const rawEvidenceApplication =
            new RecordingRawEvidenceApplication();

        rawEvidenceApplication.evidence = {
            ...emptyEvidence([
                relationshipOne
            ]),

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

                    campaign:
                        "current-campaign",

                    consentChannels:
                        [],

                    doNotContact:
                        false,

                    recentEvents:
                        []
                } as InsuranceLeadPresentation
            ]
        };

        const application =
            createInsuranceAcquisitionCreatedAtAsOfPerformanceSnapshotApplication(
                new RecordingCohortReader([
                    {
                        relationshipId:
                            relationshipOne
                    }
                ]),
                rawEvidenceApplication
            );

        const result =
            await application
                .getCreatedAtAsOfSnapshot({
                    createdAtFromInclusive:
                        "2025-01-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-01-01T00:00:00.000Z",

                    asOfExclusive:
                        "2026-01-01T00:00:00.000Z",

                    dimensions: [
                        "quoteStatus",
                        "campaign"
                    ]
                });

        assert.equal(
            result.dimensions[0]
                ?.economics
                .buckets[0]
                ?.dimensionValue,
            "bound"
        );

        assert.equal(
            result.dimensions[1]
                ?.economics
                .buckets[0]
                ?.dimensionValue,
            "current-campaign"
        );
    }
);


test(
    "empty created-at cohort performs one zero-read raw batch call and returns zero projections",
    async () => {
        const cohortReader =
            new RecordingCohortReader(
                []
            );

        const rawEvidenceApplication =
            new RecordingRawEvidenceApplication();

        const application =
            createInsuranceAcquisitionCreatedAtAsOfPerformanceSnapshotApplication(
                cohortReader,
                rawEvidenceApplication
            );

        const result =
            await application
                .getCreatedAtAsOfSnapshot({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    asOfExclusive:
                        "2026-10-01T00:00:00.000Z",

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
            result.dimensions.length,
            1
        );

        assert.equal(
            result.dimensions[0]
                ?.economics
                .relationshipCount,
            0
        );

        assert.equal(
            result.dimensions[0]
                ?.outcomes
                .relationshipCount,
            0
        );

        assert.deepEqual(
            result.dimensions[0]
                ?.costPerOutcome
                .buckets,
            []
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
            createInsuranceAcquisitionCreatedAtAsOfPerformanceSnapshotApplication(
                cohortReader,
                rawEvidenceApplication
            );

        await assert.rejects(
            application
                .getCreatedAtAsOfSnapshot({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    asOfExclusive:
                        "2026-10-01T00:00:00.000Z",

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
    "canonical as-of validation remains owned by INS-004K after the single raw load",
    async () => {
        const cohortReader =
            new RecordingCohortReader([
                {
                    relationshipId:
                        relationshipOne
                }
            ]);

        const rawEvidenceApplication =
            new RecordingRawEvidenceApplication();

        const application =
            createInsuranceAcquisitionCreatedAtAsOfPerformanceSnapshotApplication(
                cohortReader,
                rawEvidenceApplication
            );

        await assert.rejects(
            application
                .getCreatedAtAsOfSnapshot({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    asOfExclusive:
                        "2026-10-01T00:00:00Z",

                    dimensions: [
                        "state"
                    ]
                }),
            /canonical UTC timestamp/
        );

        assert.equal(
            cohortReader.calls,
            1
        );

        assert.equal(
            rawEvidenceApplication.calls,
            1
        );
    }
);

test(
    "projects explicit limited cohort metadata before as-of evidence loading",
    async () => {
        const cohortReader =
            new RecordingCohortReader(
                []
            );

        const rawEvidenceApplication =
            new RecordingRawEvidenceApplication();

        const application =
            createInsuranceAcquisitionCreatedAtAsOfPerformanceSnapshotApplication(
                cohortReader,
                rawEvidenceApplication
            );

        const result =
            await application
                .getCreatedAtAsOfSnapshot({
                    createdAtFromInclusive:
                        "2026-09-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    asOfExclusive:
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
            rawEvidenceApplication.calls,
            1
        );
    }
);
