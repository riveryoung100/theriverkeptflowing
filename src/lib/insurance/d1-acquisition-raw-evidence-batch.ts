import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";

import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";

import type {
    RiverCrmD1Database
} from "../river-os/d1-crm";

import type {
    InsuranceAcquisitionCostFact,
    InsuranceCommissionFact,
    InsurancePremiumFact,
    InsuranceRenewalFact
} from "./acquisition-economics";

import type {
    InsuranceAcquisitionOutcomeFact
} from "./acquisition-outcomes";

import type {
    InsuranceLeadPresentation
} from "./lead-presentation";

import {
    createD1InsuranceLeadPresentationPersistence
} from "./d1-lead-presentation";

import {
    createD1InsuranceAcquisitionEconomicsPersistence
} from "./d1-acquisition-economics";

import {
    createD1InsuranceAcquisitionOutcomePersistence
} from "./d1-acquisition-outcomes";

import type {
    InsuranceAttributedEconomicsBatchFactReader,
    InsuranceAttributedEconomicsBatchPresentationReader
} from "./d1-attributed-economics-batch";


export const INSURANCE_ACQUISITION_RAW_EVIDENCE_BATCH_VERSION =
    "insurance-acquisition-raw-evidence-batch-v1" as const;


export interface InsuranceAcquisitionRawEvidenceOutcomeReader {
    listForRelationships(
        relationshipIds:
            readonly RiverCrmRelationshipId[]
    ): Promise<
        readonly InsuranceAcquisitionOutcomeFact[]
    >;
}


export interface InsuranceAcquisitionRawEvidenceBatch {
    readonly projectionVersion:
        typeof INSURANCE_ACQUISITION_RAW_EVIDENCE_BATCH_VERSION;

    readonly relationshipIds:
        readonly RiverCrmRelationshipId[];

    readonly presentations:
        readonly InsuranceLeadPresentation[];

    readonly acquisitionCosts:
        readonly InsuranceAcquisitionCostFact[];

    readonly premiumFacts:
        readonly InsurancePremiumFact[];

    readonly commissionFacts:
        readonly InsuranceCommissionFact[];

    readonly renewalFacts:
        readonly InsuranceRenewalFact[];

    readonly outcomeFacts:
        readonly InsuranceAcquisitionOutcomeFact[];
}


export interface InsuranceAcquisitionRawEvidenceBatchApplication {
    getEvidence(
        relationshipIds:
            readonly RiverCrmRelationshipId[]
    ): Promise<
        InsuranceAcquisitionRawEvidenceBatch
    >;
}


function canonicalRelationshipIds(
    values:
        readonly RiverCrmRelationshipId[]
): readonly RiverCrmRelationshipId[] {
    const result:
        RiverCrmRelationshipId[] = [];

    const seen =
        new Set<
            RiverCrmRelationshipId
        >();

    for(const value of values){
        const relationshipId =
            requireRiverCrmRelationshipId(
                value
            );

        if(seen.has(relationshipId)){
            continue;
        }

        seen.add(
            relationshipId
        );

        result.push(
            relationshipId
        );
    }

    return result;
}


function requireRequestedRelationship(
    value:
        unknown,
    requested:
        ReadonlySet<RiverCrmRelationshipId>,
    family:
        string
): RiverCrmRelationshipId {
    const relationshipId =
        requireRiverCrmRelationshipId(
            value
        );

    if(!requested.has(relationshipId)){
        throw new RangeError(
            `Insurance acquisition raw evidence ${family} belongs outside the requested cohort.`
        );
    }

    return relationshipId;
}


function validatePresentations(
    values:
        readonly InsuranceLeadPresentation[],
    requested:
        ReadonlySet<RiverCrmRelationshipId>
): void {
    const seen =
        new Set<
            RiverCrmRelationshipId
        >();

    for(const value of values){
        const relationshipId =
            requireRequestedRelationship(
                value.relationshipId,
                requested,
                "presentation"
            );

        if(seen.has(relationshipId)){
            throw new RangeError(
                "Insurance acquisition raw evidence received duplicate presentation relationship identity."
            );
        }

        seen.add(
            relationshipId
        );
    }
}


function validateEvidenceRelationships<
    T extends {
        readonly relationshipId:
            unknown;
    }
>(
    values:
        readonly T[],
    requested:
        ReadonlySet<RiverCrmRelationshipId>,
    family:
        string
): void {
    for(const value of values){
        requireRequestedRelationship(
            value.relationshipId,
            requested,
            family
        );
    }
}


function emptyEvidence(): InsuranceAcquisitionRawEvidenceBatch {
    return {
        projectionVersion:
            INSURANCE_ACQUISITION_RAW_EVIDENCE_BATCH_VERSION,

        relationshipIds:
            [],

        presentations:
            [],

        acquisitionCosts:
            [],

        premiumFacts:
            [],

        commissionFacts:
            [],

        renewalFacts:
            [],

        outcomeFacts:
            []
    };
}


export function createInsuranceAcquisitionRawEvidenceBatchApplication(
    presentationReader:
        InsuranceAttributedEconomicsBatchPresentationReader,
    factReader:
        InsuranceAttributedEconomicsBatchFactReader,
    outcomeReader:
        InsuranceAcquisitionRawEvidenceOutcomeReader
): InsuranceAcquisitionRawEvidenceBatchApplication {
    return {
        async getEvidence(
            requestedRelationshipIds
        ){
            const relationshipIds =
                canonicalRelationshipIds(
                    requestedRelationshipIds
                );

            if(relationshipIds.length === 0){
                return emptyEvidence();
            }

            const requested =
                new Set<
                    RiverCrmRelationshipId
                >(
                    relationshipIds
                );

            const [
                presentations,
                acquisitionCosts,
                premiumFacts,
                commissionFacts,
                renewalFacts,
                outcomeFacts
            ] =
                await Promise.all([
                    presentationReader
                        .listForRelationships(
                            relationshipIds
                        ),

                    factReader
                        .listAcquisitionCostsForRelationships(
                            relationshipIds
                        ),

                    factReader
                        .listPremiumFactsForRelationships(
                            relationshipIds
                        ),

                    factReader
                        .listCommissionFactsForRelationships(
                            relationshipIds
                        ),

                    factReader
                        .listRenewalFactsForRelationships(
                            relationshipIds
                        ),

                    outcomeReader
                        .listForRelationships(
                            relationshipIds
                        )
                ]);

            validatePresentations(
                presentations,
                requested
            );

            validateEvidenceRelationships(
                acquisitionCosts,
                requested,
                "acquisition cost fact"
            );

            validateEvidenceRelationships(
                premiumFacts,
                requested,
                "premium fact"
            );

            validateEvidenceRelationships(
                commissionFacts,
                requested,
                "commission fact"
            );

            validateEvidenceRelationships(
                renewalFacts,
                requested,
                "renewal fact"
            );

            validateEvidenceRelationships(
                outcomeFacts,
                requested,
                "outcome fact"
            );

            return {
                projectionVersion:
                    INSURANCE_ACQUISITION_RAW_EVIDENCE_BATCH_VERSION,

                relationshipIds,
                presentations,
                acquisitionCosts,
                premiumFacts,
                commissionFacts,
                renewalFacts,
                outcomeFacts
            };
        }
    };
}


export function createD1InsuranceAcquisitionRawEvidenceBatchApplication(
    database:
        RiverCrmD1Database
): InsuranceAcquisitionRawEvidenceBatchApplication {
    return createInsuranceAcquisitionRawEvidenceBatchApplication(
        createD1InsuranceLeadPresentationPersistence(
            database
        ),
        createD1InsuranceAcquisitionEconomicsPersistence(
            database
        ),
        createD1InsuranceAcquisitionOutcomePersistence(
            database
        )
    );
}
