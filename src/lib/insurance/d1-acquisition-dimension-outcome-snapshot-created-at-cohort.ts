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
    createD1InsuranceAcquisitionDimensionOutcomeSnapshotApplication
} from "./acquisition-dimension-outcome-snapshot";

import type {
    InsuranceAcquisitionDimensionOutcomeSnapshot,
    InsuranceAcquisitionDimensionOutcomeSnapshotApplication
} from "./acquisition-dimension-outcome-snapshot";


export type InsuranceCreatedAtDimensionOutcomeSnapshotCohortReader =
    InsuranceCreatedAtCohortPageReader;


export interface GetInsuranceCreatedAtDimensionOutcomeSnapshotInput {
    readonly createdAtFromInclusive:
        string;

    readonly createdAtToExclusive:
        string;

    readonly limit?:
        number;

    readonly dimensions:
        readonly InsuranceAcquisitionAggregateDimension[];
}


export type InsuranceCreatedAtDimensionOutcomeSnapshotResult =
    InsuranceAcquisitionDimensionOutcomeSnapshot & {
        readonly cohort:
            InsuranceCreatedAtReportCohortMetadata;
    };


export interface InsuranceCreatedAtDimensionOutcomeSnapshotApplication {
    getCreatedAtSnapshot(
        input:
            GetInsuranceCreatedAtDimensionOutcomeSnapshotInput
    ): Promise<
        InsuranceCreatedAtDimensionOutcomeSnapshotResult
    >;
}


export function createInsuranceCreatedAtDimensionOutcomeSnapshotApplication(
    cohortReader:
        InsuranceCreatedAtDimensionOutcomeSnapshotCohortReader,
    snapshotApplication:
        InsuranceAcquisitionDimensionOutcomeSnapshotApplication
): InsuranceCreatedAtDimensionOutcomeSnapshotApplication {
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


export function createD1InsuranceCreatedAtDimensionOutcomeSnapshotApplication(
    database:
        RiverCrmD1Database
): InsuranceCreatedAtDimensionOutcomeSnapshotApplication {
    return createInsuranceCreatedAtDimensionOutcomeSnapshotApplication(
        createD1RiverCrmPersistence(
            database
        ),
        createD1InsuranceAcquisitionDimensionOutcomeSnapshotApplication(
            database
        )
    );
}
