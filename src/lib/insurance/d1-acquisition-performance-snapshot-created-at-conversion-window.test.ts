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
    createInsuranceAcquisitionCreatedAtConversionWindowPerformanceSnapshotApplication,
    INSURANCE_ACQUISITION_CREATED_AT_CONVERSION_WINDOW_PERFORMANCE_SNAPSHOT_VERSION
} from "./d1-acquisition-performance-snapshot-created-at-conversion-window";

import type {
    InsuranceCreatedAtConversionWindowPerformanceSnapshotCohortReader
} from "./d1-acquisition-performance-snapshot-created-at-conversion-window";


const relationshipOne =
    "relationship:ins-004q-a" as RiverCrmRelationshipId;

const relationshipTwo =
    "relationship:ins-004q-b" as RiverCrmRelationshipId;

const relationshipThree =
    "relationship:ins-004q-c" as RiverCrmRelationshipId;


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
implements InsuranceCreatedAtConversionWindowPerformanceSnapshotCohortReader {
    calls =
        0;

    query:
        Parameters<
            InsuranceCreatedAtConversionWindowPerformanceSnapshotCohortReader[
                "listCreatedAtRange"
            ]
        >[0] | undefined;

    constructor(
        readonly relationships:
            readonly {
                readonly relationshipId:
                    string;

                readonly createdAt:
                    string;
            }[]
    ){}

    async listCreatedAtRange(
        query:
            Parameters<
                InsuranceCreatedAtConversionWindowPerformanceSnapshotCohortReader[
                    "listCreatedAtRange"
                ]
            >[0]
    ){
        this.calls +=
            1;

        this.query =
            query;

        return this.relationships;
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
    "uses only fully mature relationships in the N-day performance denominator",
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
                        "2026-08-15T00:00:00.000Z"
                },
                {
                    relationshipId:
                        relationshipThree,

                    createdAt:
                        "2026-09-15T00:00:00.000Z"
                }
            ]);

        const rawEvidenceApplication =
            new RecordingRawEvidenceApplication();

        const application =
            createInsuranceAcquisitionCreatedAtConversionWindowPerformanceSnapshotApplication(
                cohortReader,
                rawEvidenceApplication
            );

        const result =
            await application
                .getCreatedAtConversionWindowSnapshot({
                    createdAtFromInclusive:
                        "2026-08-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    asOfExclusive:
                        "2026-10-01T00:00:00.000Z",

                    windowDays:
                        30,

                    dimensions: [
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
                relationshipTwo,
                relationshipThree
            ]
        );

        assert.equal(
            result.version,
            INSURANCE_ACQUISITION_CREATED_AT_CONVERSION_WINDOW_PERFORMANCE_SNAPSHOT_VERSION
        );

        assert.equal(
            result.cohortRelationshipCount,
            3
        );

        assert.equal(
            result.matureRelationshipCount,
            2
        );

        assert.equal(
            result.immatureRelationshipCount,
            1
        );

        assert.equal(
            result.overall.relationshipCount,
            2
        );

        assert.equal(
            result.dimensions[0]
                ?.economics
                .relationshipCount,
            2
        );

        assert.equal(
            result.dimensions[0]
                ?.outcomes
                .relationshipCount,
            2
        );
    }
);


test(
    "uses the complete lower-inclusive upper-exclusive window for economics outcomes and cost per quote",
    async () => {
        const createdAt =
            "2026-09-01T00:00:00.000Z";

        const beforeCreatedAt =
            "2026-08-31T23:59:59.999Z";

        const inside =
            "2026-09-30T23:59:59.999Z";

        const windowBoundary =
            "2026-10-01T00:00:00.000Z";

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
                        "acquisition-cost:ins-004q-before",

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
                        beforeCreatedAt
                }),

                createInsuranceAcquisitionCostFact({
                    costId:
                        "acquisition-cost:ins-004q-at-created",

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
                        createdAt
                }),

                createInsuranceAcquisitionCostFact({
                    costId:
                        "acquisition-cost:ins-004q-boundary",

                    relationshipId:
                        relationshipOne,

                    category:
                        "advertising",

                    money: {
                        amountMinorUnits:
                            8000,

                        currency:
                            "USD"
                    },

                    occurredAt:
                        windowBoundary
                })
            ],

            premiumFacts: [
                createInsurancePremiumFact({
                    premiumFactId:
                        "premium-fact:ins-004q-inside",

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
                        inside
                }),

                createInsurancePremiumFact({
                    premiumFactId:
                        "premium-fact:ins-004q-boundary",

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
                        windowBoundary
                })
            ],

            commissionFacts:
                [],

            renewalFacts:
                [],

            outcomeFacts: [
                createInsuranceAcquisitionOutcomeFact({
                    outcomeFactId:
                        "outcome-fact:ins-004q-at-created",

                    relationshipId:
                        relationshipOne,

                    kind:
                        "quoted",

                    occurredAt:
                        createdAt
                }),

                createInsuranceAcquisitionOutcomeFact({
                    outcomeFactId:
                        "outcome-fact:ins-004q-boundary",

                    relationshipId:
                        relationshipOne,

                    kind:
                        "bound",

                    occurredAt:
                        windowBoundary
                })
            ]
        };

        const application =
            createInsuranceAcquisitionCreatedAtConversionWindowPerformanceSnapshotApplication(
                new RecordingCohortReader([
                    {
                        relationshipId:
                            relationshipOne,

                        createdAt
                    }
                ]),
                rawEvidenceApplication
            );

        const result =
            await application
                .getCreatedAtConversionWindowSnapshot({
                    createdAtFromInclusive:
                        createdAt,

                    createdAtToExclusive:
                        "2026-09-02T00:00:00.000Z",

                    asOfExclusive:
                        "2026-11-01T00:00:00.000Z",

                    windowDays:
                        30,

                    dimensions: [
                        "acquisitionSource"
                    ]
                });

        const projection =
            result.dimensions[0];

        assert.equal(
            result.overall.currencies[0]
                ?.acquisitionCostMinorUnits,
            1000
        );

        assert.equal(
            result.overall.currencies[0]
                ?.writtenPremiumMinorUnits,
            180000
        );

        assert.equal(
            result.overall.outcomes.quotedRelationshipCount,
            1
        );

        assert.equal(
            result.overall.outcomes.boundRelationshipCount,
            0
        );

        assert.deepEqual(
            result.overall.rates.quoteRate,
            {
                numerator:
                    1,

                denominator:
                    1
            }
        );

        assert.deepEqual(
            result.overall.rates.bindRate,
            {
                numerator:
                    0,

                denominator:
                    1
            }
        );

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
    "filters current presentation segmentation to mature relationships only",
    async () => {
        const rawEvidenceApplication =
            new RecordingRawEvidenceApplication();

        rawEvidenceApplication.evidence = {
            ...emptyEvidence([
                relationshipOne,
                relationshipTwo
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
                        "mature-campaign",

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
                        "NM",

                    postalCode:
                        "88220",

                    productInterest:
                        "home",

                    quoteStatus:
                        "quoted",

                    campaign:
                        "immature-campaign",

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
            createInsuranceAcquisitionCreatedAtConversionWindowPerformanceSnapshotApplication(
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
                .getCreatedAtConversionWindowSnapshot({
                    createdAtFromInclusive:
                        "2026-08-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-10-01T00:00:00.000Z",

                    asOfExclusive:
                        "2026-10-01T00:00:00.000Z",

                    windowDays:
                        30,

                    dimensions: [
                        "campaign"
                    ]
                });

        assert.equal(
            result.matureRelationshipCount,
            1
        );

        assert.deepEqual(
            result.dimensions[0]
                ?.economics
                .buckets
                .map(
                    bucket =>
                        bucket.dimensionValue
                ),
            [
                "mature-campaign"
            ]
        );

        assert.deepEqual(
            result.dimensions[0]
                ?.outcomes
                .buckets
                .map(
                    bucket =>
                        bucket.dimensionValue
                ),
            [
                "mature-campaign"
            ]
        );
    }
);


test(
    "empty created-at cohort produces zero mature denominator with one zero-read raw batch call",
    async () => {
        const cohortReader =
            new RecordingCohortReader(
                []
            );

        const rawEvidenceApplication =
            new RecordingRawEvidenceApplication();

        const application =
            createInsuranceAcquisitionCreatedAtConversionWindowPerformanceSnapshotApplication(
                cohortReader,
                rawEvidenceApplication
            );

        const result =
            await application
                .getCreatedAtConversionWindowSnapshot({
                    createdAtFromInclusive:
                        "2026-08-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-09-01T00:00:00.000Z",

                    asOfExclusive:
                        "2026-10-01T00:00:00.000Z",

                    windowDays:
                        30,

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
            result.matureRelationshipCount,
            0
        );

        assert.equal(
            result.immatureRelationshipCount,
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
            createInsuranceAcquisitionCreatedAtConversionWindowPerformanceSnapshotApplication(
                cohortReader,
                rawEvidenceApplication
            );

        await assert.rejects(
            application
                .getCreatedAtConversionWindowSnapshot({
                    createdAtFromInclusive:
                        "2026-08-01T00:00:00.000Z",

                    createdAtToExclusive:
                        "2026-09-01T00:00:00.000Z",

                    asOfExclusive:
                        "2026-10-01T00:00:00.000Z",

                    windowDays:
                        30,

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
