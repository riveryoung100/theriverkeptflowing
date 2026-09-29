import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";

import type {
    RiverCrmCreatedAtCohortQuery
} from "../river-os/crm-workspace";

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


export interface InsuranceCreatedAtSnapshotCohortReader {
    listCreatedAtRange(
        query:
            RiverCrmCreatedAtCohortQuery
    ): Promise<
        readonly {
            readonly relationshipId:
                string;
        }[]
    >;
}


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


export interface InsuranceCreatedAtAggregateSnapshotApplication {
    getCreatedAtSnapshot(
        input:
            GetInsuranceCreatedAtAggregateSnapshotInput
    ): Promise<
        InsuranceAcquisitionAggregateSnapshot
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

            const relationships =
                await cohortReader
                    .listCreatedAtRange(
                        cohortQuery
                    );

            const relationshipIds =
                relationships.map(
                    relationship=>
                        requireRiverCrmRelationshipId(
                            relationship.relationshipId
                        )
                );

            return snapshotApplication
                .getSnapshot({
                    relationshipIds,
                    dimensions:
                        input.dimensions
                });
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
