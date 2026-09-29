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


export interface InsuranceCreatedAtDimensionOutcomeSnapshotCohortReader {
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


export interface InsuranceCreatedAtDimensionOutcomeSnapshotApplication {
    getCreatedAtSnapshot(
        input:
            GetInsuranceCreatedAtDimensionOutcomeSnapshotInput
    ): Promise<
        InsuranceAcquisitionDimensionOutcomeSnapshot
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
                    relationship =>
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
