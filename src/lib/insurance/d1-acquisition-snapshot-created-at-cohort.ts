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
    InsuranceAcquisitionAggregateDimension
} from "./acquisition-aggregate-analytics";

import type {
    InsuranceAcquisitionAggregateSnapshot,
    InsuranceAcquisitionAggregateSnapshotApplication
} from "./acquisition-aggregate-snapshot";

import {
    createD1InsuranceAcquisitionAggregateSnapshotApplication
} from "./acquisition-aggregate-snapshot";


export type InsuranceCreatedAtSnapshotCohortReader =
    InsuranceCreatedAtCohortPageReader;


export interface GetInsuranceCreatedAtAggregateSnapshotInput {
    readonly createdAtFromInclusive:
        string;

    readonly createdAtToExclusive:
        string;

    readonly dimensions:
        readonly InsuranceAcquisitionAggregateDimension[];

    readonly limit?:
        number;
}


export type InsuranceCreatedAtAggregateSnapshotResult =
    InsuranceAcquisitionAggregateSnapshot & {
        readonly cohort:
            InsuranceCreatedAtReportCohortMetadata;
    };


export interface InsuranceCreatedAtAggregateSnapshotApplication {
    getCreatedAtSnapshot(
        input:
            GetInsuranceCreatedAtAggregateSnapshotInput
    ): Promise<
        InsuranceCreatedAtAggregateSnapshotResult
    >;
}


export function createInsuranceCreatedAtAggregateSnapshotApplication(
    cohortReader:
        InsuranceCreatedAtSnapshotCohortReader,
    snapshotApplication:
        InsuranceAcquisitionAggregateSnapshotApplication
): InsuranceCreatedAtAggregateSnapshotApplication {
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
                    relationship=>
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


export function createD1InsuranceCreatedAtAggregateSnapshotApplication(
    database:
        D1Database
): InsuranceCreatedAtAggregateSnapshotApplication {
    return createInsuranceCreatedAtAggregateSnapshotApplication(
        createD1RiverCrmPersistence(
            database
        ),
        createD1InsuranceAcquisitionAggregateSnapshotApplication(
            database
        )
    );
}
