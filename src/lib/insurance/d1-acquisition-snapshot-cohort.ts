import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";

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


export interface InsuranceRecentRelationshipSnapshotCohortReader {
    list(
        limit?:
            number
    ): Promise<
        readonly {
            readonly relationshipId:
                string;
        }[]
    >;
}


export interface GetInsuranceRecentRelationshipAggregateSnapshotInput {
    readonly dimensions:
        readonly InsuranceAcquisitionAggregateDimension[];

    readonly limit?:
        number;
}


export interface InsuranceRecentRelationshipAggregateSnapshotApplication {
    getRecentRelationshipSnapshot(
        input:
            GetInsuranceRecentRelationshipAggregateSnapshotInput
    ): Promise<
        InsuranceAcquisitionAggregateSnapshot
    >;
}


export function createInsuranceRecentRelationshipAggregateSnapshotApplication(
    cohortReader:
        InsuranceRecentRelationshipSnapshotCohortReader,
    snapshotApplication:
        InsuranceAcquisitionAggregateSnapshotApplication
): InsuranceRecentRelationshipAggregateSnapshotApplication {
    return {
        async getRecentRelationshipSnapshot(
            input
        ){
            const relationships =
                input.limit === undefined
                    ? await cohortReader.list()
                    : await cohortReader.list(
                        input.limit
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


export function createD1InsuranceRecentRelationshipAggregateSnapshotApplication(
    database:
        D1Database
): InsuranceRecentRelationshipAggregateSnapshotApplication {
    return createInsuranceRecentRelationshipAggregateSnapshotApplication(
        createD1RiverCrmPersistence(
            database
        ),
        createD1InsuranceAcquisitionAggregateSnapshotApplication(
            database
        )
    );
}
