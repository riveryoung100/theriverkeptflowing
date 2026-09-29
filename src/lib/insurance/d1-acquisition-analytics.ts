import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";

import type {
    RiverCrmD1Database
} from "../river-os/d1-crm-growth";

import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";

import {
    createInsuranceRelationshipAcquisitionAnalytics
} from "./acquisition-analytics";

import type {
    InsuranceRelationshipAcquisitionAnalytics
} from "./acquisition-analytics";

import {
    createD1InsuranceAcquisitionEconomicsPersistence
} from "./d1-acquisition-economics";

import type {
    D1InsuranceAcquisitionEconomicsPersistence
} from "./d1-acquisition-economics";


export interface InsuranceAcquisitionAnalyticsFactReader {
    listAcquisitionCostsForRelationship(
        relationshipId:
            RiverCrmRelationshipId
    ): ReturnType<
        D1InsuranceAcquisitionEconomicsPersistence[
            "listAcquisitionCostsForRelationship"
        ]
    >;

    listPremiumFactsForRelationship(
        relationshipId:
            RiverCrmRelationshipId
    ): ReturnType<
        D1InsuranceAcquisitionEconomicsPersistence[
            "listPremiumFactsForRelationship"
        ]
    >;

    listCommissionFactsForRelationship(
        relationshipId:
            RiverCrmRelationshipId
    ): ReturnType<
        D1InsuranceAcquisitionEconomicsPersistence[
            "listCommissionFactsForRelationship"
        ]
    >;

    listRenewalFactsForRelationship(
        relationshipId:
            RiverCrmRelationshipId
    ): ReturnType<
        D1InsuranceAcquisitionEconomicsPersistence[
            "listRenewalFactsForRelationship"
        ]
    >;
}


export interface InsuranceRelationshipAcquisitionAnalyticsApplication {
    getRelationshipAnalytics(
        relationshipId:
            RiverCrmRelationshipId
    ): Promise<
        InsuranceRelationshipAcquisitionAnalytics
    >;
}


export function createInsuranceRelationshipAcquisitionAnalyticsApplication(
    reader:
        InsuranceAcquisitionAnalyticsFactReader
): InsuranceRelationshipAcquisitionAnalyticsApplication {
    return {
        async getRelationshipAnalytics(
            relationshipId
        ){
            const canonicalRelationshipId =
                requireRiverCrmRelationshipId(
                    relationshipId
                );

            const [
                acquisitionCosts,
                premiumFacts,
                commissionFacts,
                renewalFacts
            ] =
                await Promise.all([
                    reader.listAcquisitionCostsForRelationship(
                        canonicalRelationshipId
                    ),

                    reader.listPremiumFactsForRelationship(
                        canonicalRelationshipId
                    ),

                    reader.listCommissionFactsForRelationship(
                        canonicalRelationshipId
                    ),

                    reader.listRenewalFactsForRelationship(
                        canonicalRelationshipId
                    )
                ]);

            return createInsuranceRelationshipAcquisitionAnalytics({
                relationshipId:
                    canonicalRelationshipId,

                acquisitionCosts,

                premiumFacts,

                commissionFacts,

                renewalFacts
            });
        }
    };
}


export function createD1InsuranceRelationshipAcquisitionAnalyticsApplication(
    database:
        RiverCrmD1Database
): InsuranceRelationshipAcquisitionAnalyticsApplication {
    return createInsuranceRelationshipAcquisitionAnalyticsApplication(
        createD1InsuranceAcquisitionEconomicsPersistence(
            database
        )
    );
}
