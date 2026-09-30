import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";

import type {
    InsuranceCreatedAtCohortPageReader
} from "./complete-created-at-cohort";

import {
    projectInsuranceCreatedAtReportCohortMetadata,
    resolveInsuranceCreatedAtReportCohort
} from "./created-at-report-cohort";

import type {
    InsuranceCreatedAtReportCohortMetadata
} from "./created-at-report-cohort";

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
    createD1InsuranceAcquisitionDimensionCostPerOutcomeSnapshotApplication
} from "./acquisition-dimension-cost-per-outcome-snapshot";

import type {
    InsuranceAcquisitionDimensionCostPerOutcomeSnapshot,
    InsuranceAcquisitionDimensionCostPerOutcomeSnapshotApplication
} from "./acquisition-dimension-cost-per-outcome-snapshot";


export type InsuranceCreatedAtDimensionCostPerOutcomeSnapshotCohortReader =
    InsuranceCreatedAtCohortPageReader;


export interface GetInsuranceCreatedAtDimensionCostPerOutcomeSnapshotInput {
    readonly createdAtFromInclusive:
        string;

    readonly createdAtToExclusive:
        string;

    readonly limit?:
        number;

    readonly dimensions:
        readonly InsuranceAcquisitionAggregateDimension[];
}


export type InsuranceCreatedAtDimensionCostPerOutcomeSnapshotResult =
    InsuranceAcquisitionDimensionCostPerOutcomeSnapshot & {
        readonly cohort:
            InsuranceCreatedAtReportCohortMetadata;
    };


export interface InsuranceCreatedAtDimensionCostPerOutcomeSnapshotApplication {
    getCreatedAtSnapshot(
        input:
            GetInsuranceCreatedAtDimensionCostPerOutcomeSnapshotInput
    ): Promise<
        InsuranceCreatedAtDimensionCostPerOutcomeSnapshotResult
    >;
}


export function createInsuranceCreatedAtDimensionCostPerOutcomeSnapshotApplication(
    cohortReader:
        InsuranceCreatedAtDimensionCostPerOutcomeSnapshotCohortReader,
    snapshotApplication:
        InsuranceAcquisitionDimensionCostPerOutcomeSnapshotApplication
): InsuranceCreatedAtDimensionCostPerOutcomeSnapshotApplication {
    return {
        async getCreatedAtSnapshot(
            input
        ){
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
                relationships.map(
                    relationship =>
                        requireRiverCrmRelationshipId(
                            relationship.relationshipId
                        )
                );

            const snapshot =
                await snapshotApplication
                    .getSnapshot({
                        relationshipIds,
                        dimensions:
                            input.dimensions
                    });

            return {
                ...snapshot,

                cohort:
                    projectInsuranceCreatedAtReportCohortMetadata(
                        cohort
                    )
            };
        }
    };
}


export function createD1InsuranceCreatedAtDimensionCostPerOutcomeSnapshotApplication(
    database:
        RiverCrmD1Database
): InsuranceCreatedAtDimensionCostPerOutcomeSnapshotApplication {
    return createInsuranceCreatedAtDimensionCostPerOutcomeSnapshotApplication(
        createD1RiverCrmPersistence(
            database
        ),
        createD1InsuranceAcquisitionDimensionCostPerOutcomeSnapshotApplication(
            database
        )
    );
}
