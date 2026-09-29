import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";

import type {
    RiverCrmD1Database
} from "../river-os/d1-crm";

import {
    createInsuranceAcquisitionAsOfEvidence
} from "./acquisition-as-of-evidence";

import type {
    InsuranceAttributedRelationshipEconomicsView
} from "./d1-acquisition-economics-view";

import {
    createInsuranceAttributedEconomicsBatchApplication
} from "./d1-attributed-economics-batch";

import {
    createD1InsuranceAcquisitionRawEvidenceBatchApplication
} from "./d1-acquisition-raw-evidence-batch";

import type {
    InsuranceAcquisitionRawEvidenceBatchApplication
} from "./d1-acquisition-raw-evidence-batch";


export const INSURANCE_ACQUISITION_AS_OF_ATTRIBUTED_ECONOMICS_BATCH_VERSION =
    "insurance-acquisition-as-of-attributed-economics-batch-v1" as const;


export interface GetInsuranceAcquisitionAsOfAttributedEconomicsInput {
    readonly relationshipIds:
        readonly RiverCrmRelationshipId[];

    readonly asOfExclusive:
        string;
}


export interface InsuranceAcquisitionAsOfAttributedEconomicsBatchResult {
    readonly projectionVersion:
        typeof INSURANCE_ACQUISITION_AS_OF_ATTRIBUTED_ECONOMICS_BATCH_VERSION;

    readonly asOfExclusive:
        string;

    readonly views:
        readonly InsuranceAttributedRelationshipEconomicsView[];
}


export interface InsuranceAcquisitionAsOfAttributedEconomicsBatchApplication {
    getViewsAsOf(
        input:
            GetInsuranceAcquisitionAsOfAttributedEconomicsInput
    ): Promise<
        InsuranceAcquisitionAsOfAttributedEconomicsBatchResult
    >;
}


export function createInsuranceAcquisitionAsOfAttributedEconomicsBatchApplication(
    rawEvidenceApplication:
        InsuranceAcquisitionRawEvidenceBatchApplication
): InsuranceAcquisitionAsOfAttributedEconomicsBatchApplication {
    return {
        async getViewsAsOf(
            input
        ){
            const rawEvidence =
                await rawEvidenceApplication
                    .getEvidence(
                        input.relationshipIds
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
                        rawEvidence.relationshipIds
                    );

            return {
                projectionVersion:
                    INSURANCE_ACQUISITION_AS_OF_ATTRIBUTED_ECONOMICS_BATCH_VERSION,

                asOfExclusive:
                    asOfEvidence.asOfExclusive,

                views
            };
        }
    };
}


export function createD1InsuranceAcquisitionAsOfAttributedEconomicsBatchApplication(
    database:
        RiverCrmD1Database
): InsuranceAcquisitionAsOfAttributedEconomicsBatchApplication {
    return createInsuranceAcquisitionAsOfAttributedEconomicsBatchApplication(
        createD1InsuranceAcquisitionRawEvidenceBatchApplication(
            database
        )
    );
}
