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
    createD1InsuranceAcquisitionDimensionCostPerOutcomeSnapshotApplication
} from "./acquisition-dimension-cost-per-outcome-snapshot";

import type {
    InsuranceAcquisitionDimensionCostPerOutcomeSnapshot,
    InsuranceAcquisitionDimensionCostPerOutcomeSnapshotApplication
} from "./acquisition-dimension-cost-per-outcome-snapshot";


export interface InsuranceCreatedAtDimensionCostPerOutcomeSnapshotCohortReader {
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


export interface InsuranceCreatedAtDimensionCostPerOutcomeSnapshotApplication {
    getCreatedAtSnapshot(
        input:
            GetInsuranceCreatedAtDimensionCostPerOutcomeSnapshotInput
    ): Promise<
        InsuranceAcquisitionDimensionCostPerOutcomeSnapshot
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
