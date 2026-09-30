import {
    createInsuranceAcquisitionOverallPerformanceSummary
} from "./acquisition-overall-performance-summary";

import type {
    InsuranceAcquisitionOverallPerformanceSummary
} from "./acquisition-overall-performance-summary";

import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";

import {
    createD1RiverCrmPersistence
} from "../river-os/d1-crm";

import type {
    RiverCrmD1Database
} from "../river-os/d1-crm";

import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";

import type {
    InsuranceAcquisitionAggregateDimension
} from "./acquisition-aggregate-analytics";

import {
    createInsuranceAcquisitionAsOfEvidence
} from "./acquisition-as-of-evidence";

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


import {
    projectInsuranceCreatedAtReportCohortMetadata,
    resolveInsuranceCreatedAtReportCohort
} from "./created-at-report-cohort";

import type {
    InsuranceCreatedAtReportCohortMetadata
} from "./created-at-report-cohort";

import type {
    InsuranceCreatedAtCohortPageReader
} from "./complete-created-at-cohort";

export const INSURANCE_ACQUISITION_CREATED_AT_AS_OF_PERFORMANCE_SNAPSHOT_VERSION =
    "insurance-acquisition-created-at-as-of-performance-snapshot-v1" as const;


export type InsuranceCreatedAtAsOfPerformanceSnapshotCohortReader =
    InsuranceCreatedAtCohortPageReader;


export interface GetInsuranceCreatedAtAsOfPerformanceSnapshotInput {
    readonly createdAtFromInclusive:
        string;

    readonly createdAtToExclusive:
        string;

    readonly asOfExclusive:
        string;

    readonly dimensions:
        readonly InsuranceAcquisitionAggregateDimension[];

    readonly limit?:
        number;
}


export interface InsuranceAcquisitionCreatedAtAsOfPerformanceSnapshot {
    readonly version:
        typeof INSURANCE_ACQUISITION_CREATED_AT_AS_OF_PERFORMANCE_SNAPSHOT_VERSION;

    readonly cohort:
        InsuranceCreatedAtReportCohortMetadata;

    readonly asOfExclusive:
        string;

    readonly relationshipCount:
        number;

    readonly overall:
        InsuranceAcquisitionOverallPerformanceSummary;

    readonly dimensions:
        readonly InsuranceAcquisitionPerformanceDimensionProjection[];
}


export interface InsuranceAcquisitionCreatedAtAsOfPerformanceSnapshotApplication {
    getCreatedAtAsOfSnapshot(
        input:
            GetInsuranceCreatedAtAsOfPerformanceSnapshotInput
    ): Promise<
        InsuranceAcquisitionCreatedAtAsOfPerformanceSnapshot
    >;
}


function canonicalRelationshipIds(
    values:
        readonly {
            readonly relationshipId:
                string;
        }[]
): readonly RiverCrmRelationshipId[] {
    const result:
        RiverCrmRelationshipId[] = [];

    const seen =
        new Set<
            RiverCrmRelationshipId
        >();

    for(const value of values){
        const relationshipId =
            requireRiverCrmRelationshipId(
                value.relationshipId
            );

        if(seen.has(relationshipId)){
            continue;
        }

        seen.add(
            relationshipId
        );

        result.push(
            relationshipId
        );
    }

    return result;
}


export function createInsuranceAcquisitionCreatedAtAsOfPerformanceSnapshotApplication(
    cohortReader:
        InsuranceCreatedAtAsOfPerformanceSnapshotCohortReader,
    rawEvidenceApplication:
        InsuranceAcquisitionRawEvidenceBatchApplication
): InsuranceAcquisitionCreatedAtAsOfPerformanceSnapshotApplication {
    return {
        async getCreatedAtAsOfSnapshot(
            input
        ){
            const dimensions =
                canonicalInsuranceAcquisitionPerformanceDimensions(
                    input.dimensions
                );

            const cohort =
                await resolveInsuranceCreatedAtReportCohort(
                    cohortReader,
                    {
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
                    }
                );

            const relationships =
                cohort.relationships;

            const relationshipIds =
                canonicalRelationshipIds(
                    relationships
                );

            const rawEvidence =
                await rawEvidenceApplication
                    .getEvidence(
                        relationshipIds
                    );

            const asOfEvidence =
                createInsuranceAcquisitionAsOfEvidence({
                    asOfExclusive:
                        input.asOfExclusive,

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

            const attributedApplication =
                createInsuranceAttributedEconomicsBatchApplication(
                    {
                        async listForRelationships(){
                            return rawEvidence.presentations;
                        }
                    },
                    {
                        async listAcquisitionCostsForRelationships(){
                            return asOfEvidence.acquisitionCosts;
                        },

                        async listPremiumFactsForRelationships(){
                            return asOfEvidence.premiumFacts;
                        },

                        async listCommissionFactsForRelationships(){
                            return asOfEvidence.commissionFacts;
                        },

                        async listRenewalFactsForRelationships(){
                            return asOfEvidence.renewalFacts;
                        }
                    }
                );

            const views =
                await attributedApplication
                    .getViews(
                        relationshipIds
                    );

            return {
                version:
                    INSURANCE_ACQUISITION_CREATED_AT_AS_OF_PERFORMANCE_SNAPSHOT_VERSION,

                cohort:
                    projectInsuranceCreatedAtReportCohortMetadata(
                        cohort
                    ),

                asOfExclusive:
                    asOfEvidence.asOfExclusive,

                relationshipCount:
                    relationshipIds.length,

                overall:
                    createInsuranceAcquisitionOverallPerformanceSummary({
                        relationshipIds,
                        views,

                        outcomeFacts:
                            asOfEvidence.outcomeFacts
                    }),

                dimensions:
                    projectInsuranceAcquisitionPerformanceDimensions(
                        dimensions,
                        relationshipIds,
                        views,
                        asOfEvidence.outcomeFacts
                    )
            };
        }
    };
}


export function createD1InsuranceAcquisitionCreatedAtAsOfPerformanceSnapshotApplication(
    database:
        RiverCrmD1Database
): InsuranceAcquisitionCreatedAtAsOfPerformanceSnapshotApplication {
    return createInsuranceAcquisitionCreatedAtAsOfPerformanceSnapshotApplication(
        createD1RiverCrmPersistence(
            database
        ),
        createD1InsuranceAcquisitionRawEvidenceBatchApplication(
            database
        )
    );
}
