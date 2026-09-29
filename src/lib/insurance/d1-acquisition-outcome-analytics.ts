import type {
    RiverCrmD1Database
} from "../river-os/d1-crm-growth";

import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";

import {
    createInsuranceAcquisitionOutcomeAnalytics
} from "./acquisition-outcome-analytics";

import type {
    InsuranceAcquisitionOutcomeAnalytics
} from "./acquisition-outcome-analytics";

import type {
    InsuranceAcquisitionOutcomeFact
} from "./acquisition-outcomes";

import {
    createD1InsuranceAcquisitionOutcomePersistence
} from "./d1-acquisition-outcomes";


export interface InsuranceAcquisitionOutcomeAnalyticsReader {
    listForRelationships(
        relationshipIds:
            readonly RiverCrmRelationshipId[]
    ): Promise<
        readonly InsuranceAcquisitionOutcomeFact[]
    >;
}


export interface GetInsuranceAcquisitionOutcomeAnalyticsInput {
    readonly relationshipIds:
        readonly RiverCrmRelationshipId[];
}


export interface InsuranceAcquisitionOutcomeAnalyticsApplication {
    getAnalytics(
        input:
            GetInsuranceAcquisitionOutcomeAnalyticsInput
    ): Promise<
        InsuranceAcquisitionOutcomeAnalytics
    >;
}


export function createInsuranceAcquisitionOutcomeAnalyticsApplication(
    reader:
        InsuranceAcquisitionOutcomeAnalyticsReader
): InsuranceAcquisitionOutcomeAnalyticsApplication {
    return {
        async getAnalytics(
            input
        ){
            const outcomeFacts =
                await reader
                    .listForRelationships(
                        input.relationshipIds
                    );

            return createInsuranceAcquisitionOutcomeAnalytics({
                relationshipIds:
                    input.relationshipIds,

                outcomeFacts
            });
        }
    };
}


export function createD1InsuranceAcquisitionOutcomeAnalyticsApplication(
    database:
        RiverCrmD1Database
): InsuranceAcquisitionOutcomeAnalyticsApplication {
    return createInsuranceAcquisitionOutcomeAnalyticsApplication(
        createD1InsuranceAcquisitionOutcomePersistence(
            database
        )
    );
}
