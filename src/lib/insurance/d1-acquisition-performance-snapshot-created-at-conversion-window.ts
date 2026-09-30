import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";

import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";

import type {
    RiverCrmCreatedAtCohortQuery
} from "../river-os/crm-workspace";

import {
    createD1RiverCrmPersistence
} from "../river-os/d1-crm";

import type {
    RiverCrmD1Database
} from "../river-os/d1-crm";

import type {
    InsuranceAcquisitionAggregateDimension
} from "./acquisition-aggregate-analytics";

import {
    createInsuranceAcquisitionConversionWindowEvidence
} from "./acquisition-conversion-window-evidence";

import {
    createInsuranceAttributedEconomicsBatchApplication
} from "./d1-attributed-economics-batch";

import {
    createD1InsuranceAcquisitionRawEvidenceBatchApplication
} from "./d1-acquisition-raw-evidence-batch";

import type {
    InsuranceAcquisitionRawEvidenceBatchApplication
} from "./d1-acquisition-raw-evidence-batch";

import {
    canonicalInsuranceAcquisitionPerformanceDimensions,
    projectInsuranceAcquisitionPerformanceDimensions
} from "./d1-acquisition-performance-snapshot-created-at-cohort";

import type {
    InsuranceAcquisitionPerformanceDimensionProjection
} from "./d1-acquisition-performance-snapshot-created-at-cohort";


export const INSURANCE_ACQUISITION_CREATED_AT_CONVERSION_WINDOW_PERFORMANCE_SNAPSHOT_VERSION =
    "insurance-acquisition-created-at-conversion-window-performance-snapshot-v1" as const;


export interface InsuranceCreatedAtConversionWindowPerformanceSnapshotCohortReader {
    listCreatedAtRange(
        query:
            RiverCrmCreatedAtCohortQuery
    ): Promise<
        readonly {
            readonly relationshipId:
                string;

            readonly createdAt:
                string;
        }[]
    >;
}


export interface GetInsuranceCreatedAtConversionWindowPerformanceSnapshotInput {
    readonly createdAtFromInclusive:
        string;

    readonly createdAtToExclusive:
        string;

    readonly asOfExclusive:
        string;

    readonly windowDays:
        number;

    readonly dimensions:
        readonly InsuranceAcquisitionAggregateDimension[];

    readonly limit?:
        number;
}


export interface InsuranceAcquisitionCreatedAtConversionWindowPerformanceSnapshot {
    readonly version:
        typeof INSURANCE_ACQUISITION_CREATED_AT_CONVERSION_WINDOW_PERFORMANCE_SNAPSHOT_VERSION;

    readonly asOfExclusive:
        string;

    readonly windowDays:
        number;

    readonly cohortRelationshipCount:
        number;

    readonly matureRelationshipCount:
        number;

    readonly immatureRelationshipCount:
        number;

    readonly dimensions:
        readonly InsuranceAcquisitionPerformanceDimensionProjection[];
}


export interface InsuranceAcquisitionCreatedAtConversionWindowPerformanceSnapshotApplication {
    getCreatedAtConversionWindowSnapshot(
        input:
            GetInsuranceCreatedAtConversionWindowPerformanceSnapshotInput
    ): Promise<
        InsuranceAcquisitionCreatedAtConversionWindowPerformanceSnapshot
    >;
}


export function createInsuranceAcquisitionCreatedAtConversionWindowPerformanceSnapshotApplication(
    cohortReader:
        InsuranceCreatedAtConversionWindowPerformanceSnapshotCohortReader,
    rawEvidenceApplication:
        InsuranceAcquisitionRawEvidenceBatchApplication
): InsuranceAcquisitionCreatedAtConversionWindowPerformanceSnapshotApplication {
    return {
        async getCreatedAtConversionWindowSnapshot(
            input
        ){
            const dimensions =
                canonicalInsuranceAcquisitionPerformanceDimensions(
                    input.dimensions
                );

            const cohortQuery:
                RiverCrmCreatedAtCohortQuery = {
                    createdAtFromInclusive:
                        input.createdAtFromInclusive,

                    createdAtToExclusive:
                        input.createdAtToExclusive,

                    ...(input.limit !== undefined
                        ? {
                            limit:
                                input.limit
                        }
                        : {})
                };

            const rawRelationships =
                await cohortReader
                    .listCreatedAtRange(
                        cohortQuery
                    );

            const relationships =
                rawRelationships.map(
                    relationship => ({
                        relationshipId:
                            requireRiverCrmRelationshipId(
                                relationship.relationshipId
                            ),

                        createdAt:
                            relationship.createdAt
                    })
                );

            const rawEvidence =
                await rawEvidenceApplication
                    .getEvidence(
                        relationships.map(
                            relationship =>
                                relationship.relationshipId
                        )
                    );

            const conversionEvidence =
                createInsuranceAcquisitionConversionWindowEvidence({
                    relationships,

                    asOfExclusive:
                        input.asOfExclusive,

                    windowDays:
                        input.windowDays,

                    acquisitionCosts:
                        rawEvidence.acquisitionCosts,

                    premiumFacts:
                        rawEvidence.premiumFacts,

                    commissionFacts:
                        rawEvidence.commissionFacts,

                    renewalFacts:
                        rawEvidence.renewalFacts,

                    outcomeFacts:
                        rawEvidence.outcomeFacts
                });

            const matureRelationshipIds =
                new Set<
                    RiverCrmRelationshipId
                >(
                    conversionEvidence.relationshipIds
                );

            const maturePresentations =
                rawEvidence.presentations.filter(
                    presentation =>
                        matureRelationshipIds.has(
                            presentation.relationshipId
                        )
                );

            const attributedApplication =
                createInsuranceAttributedEconomicsBatchApplication(
                    {
                        async listForRelationships(){
                            return maturePresentations;
                        }
                    },
                    {
                        async listAcquisitionCostsForRelationships(){
                            return conversionEvidence.acquisitionCosts;
                        },

                        async listPremiumFactsForRelationships(){
                            return conversionEvidence.premiumFacts;
                        },

                        async listCommissionFactsForRelationships(){
                            return conversionEvidence.commissionFacts;
                        },

                        async listRenewalFactsForRelationships(){
                            return conversionEvidence.renewalFacts;
                        }
                    }
                );

            const views =
                await attributedApplication
                    .getViews(
                        conversionEvidence.relationshipIds
                    );

            return {
                version:
                    INSURANCE_ACQUISITION_CREATED_AT_CONVERSION_WINDOW_PERFORMANCE_SNAPSHOT_VERSION,

                asOfExclusive:
                    conversionEvidence.asOfExclusive,

                windowDays:
                    conversionEvidence.windowDays,

                cohortRelationshipCount:
                    conversionEvidence.cohortRelationshipCount,

                matureRelationshipCount:
                    conversionEvidence.matureRelationshipCount,

                immatureRelationshipCount:
                    conversionEvidence.immatureRelationshipCount,

                dimensions:
                    projectInsuranceAcquisitionPerformanceDimensions(
                        dimensions,
                        conversionEvidence.relationshipIds,
                        views,
                        conversionEvidence.outcomeFacts
                    )
            };
        }
    };
}


export function createD1InsuranceAcquisitionCreatedAtConversionWindowPerformanceSnapshotApplication(
    database:
        RiverCrmD1Database
): InsuranceAcquisitionCreatedAtConversionWindowPerformanceSnapshotApplication {
    return createInsuranceAcquisitionCreatedAtConversionWindowPerformanceSnapshotApplication(
        createD1RiverCrmPersistence(
            database
        ),
        createD1InsuranceAcquisitionRawEvidenceBatchApplication(
            database
        )
    );
}
