import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";

import type {
    RiverCrmD1Database
} from "../river-os/d1-crm-growth";

import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";

import type {
    InsuranceAcquisitionCostFact,
    InsuranceCommissionFact,
    InsurancePremiumFact,
    InsuranceRenewalFact
} from "./acquisition-economics";

import {
    createInsuranceRelationshipAcquisitionAnalytics
} from "./acquisition-analytics";

import type {
    InsuranceLeadPresentation
} from "./lead-presentation";

import {
    createD1InsuranceLeadPresentationPersistence
} from "./d1-lead-presentation";

import {
    createD1InsuranceAcquisitionEconomicsPersistence
} from "./d1-acquisition-economics";

import type {
    InsuranceAttributedRelationshipEconomicsView
} from "./d1-acquisition-economics-view";


export interface InsuranceAttributedEconomicsBatchPresentationReader {
    listForRelationships(
        relationshipIds:
            readonly RiverCrmRelationshipId[]
    ): Promise<
        readonly InsuranceLeadPresentation[]
    >;
}


export interface InsuranceAttributedEconomicsBatchFactReader {
    listAcquisitionCostsForRelationships(
        relationshipIds:
            readonly RiverCrmRelationshipId[]
    ): Promise<
        readonly InsuranceAcquisitionCostFact[]
    >;

    listPremiumFactsForRelationships(
        relationshipIds:
            readonly RiverCrmRelationshipId[]
    ): Promise<
        readonly InsurancePremiumFact[]
    >;

    listCommissionFactsForRelationships(
        relationshipIds:
            readonly RiverCrmRelationshipId[]
    ): Promise<
        readonly InsuranceCommissionFact[]
    >;

    listRenewalFactsForRelationships(
        relationshipIds:
            readonly RiverCrmRelationshipId[]
    ): Promise<
        readonly InsuranceRenewalFact[]
    >;
}


export interface InsuranceAttributedEconomicsBatchApplication {
    getViews(
        relationshipIds:
            readonly RiverCrmRelationshipId[]
    ): Promise<
        readonly InsuranceAttributedRelationshipEconomicsView[]
    >;
}


function canonicalRequestedRelationshipIds(
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

        if(!seen.has(relationshipId)){
            seen.add(
                relationshipId
            );

            result.push(
                relationshipId
            );
        }
    }

    return result;
}


function presentationMap(
    values:
        readonly InsuranceLeadPresentation[],
    requested:
        ReadonlySet<
            RiverCrmRelationshipId
        >
): ReadonlyMap<
    RiverCrmRelationshipId,
    InsuranceLeadPresentation
> {
    const result =
        new Map<
            RiverCrmRelationshipId,
            InsuranceLeadPresentation
        >();

    for(const value of values){
        const relationshipId =
            requireRiverCrmRelationshipId(
                value.relationshipId
            );

        if(!requested.has(relationshipId)){
            throw new TypeError(
                "Attributed economics batch presentation reader returned a relationship outside the requested cohort."
            );
        }

        if(result.has(relationshipId)){
            throw new TypeError(
                "Attributed economics batch requires at most one presentation per requested relationship."
            );
        }

        result.set(
            relationshipId,
            value
        );
    }

    return result;
}


function groupFactsByRelationship<
    T extends {
        readonly relationshipId:
            RiverCrmRelationshipId;
    }
>(
    values:
        readonly T[],
    requested:
        ReadonlySet<
            RiverCrmRelationshipId
        >,
    factType:
        string
): ReadonlyMap<
    RiverCrmRelationshipId,
    readonly T[]
> {
    const result =
        new Map<
            RiverCrmRelationshipId,
            T[]
        >();

    for(const value of values){
        const relationshipId =
            requireRiverCrmRelationshipId(
                value.relationshipId
            );

        if(!requested.has(relationshipId)){
            throw new TypeError(
                `Attributed economics batch ${factType} reader returned a relationship outside the requested cohort.`
            );
        }

        const existing =
            result.get(
                relationshipId
            );

        if(existing !== undefined){
            existing.push(
                value
            );
        }
        else{
            result.set(
                relationshipId,
                [
                    value
                ]
            );
        }
    }

    return result;
}


export function createInsuranceAttributedEconomicsBatchApplication(
    presentationReader:
        InsuranceAttributedEconomicsBatchPresentationReader,
    factReader:
        InsuranceAttributedEconomicsBatchFactReader
): InsuranceAttributedEconomicsBatchApplication {
    return {
        async getViews(
            requestedRelationshipIds
        ){
            const relationshipIds =
                canonicalRequestedRelationshipIds(
                    requestedRelationshipIds
                );

            if(relationshipIds.length === 0){
                return [];
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
                renewalFacts
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
                        )
                ]);

            const presentationsByRelationship =
                presentationMap(
                    presentations,
                    requested
                );

            const acquisitionCostsByRelationship =
                groupFactsByRelationship(
                    acquisitionCosts,
                    requested,
                    "acquisition-cost"
                );

            const premiumFactsByRelationship =
                groupFactsByRelationship(
                    premiumFacts,
                    requested,
                    "premium"
                );

            const commissionFactsByRelationship =
                groupFactsByRelationship(
                    commissionFacts,
                    requested,
                    "commission"
                );

            const renewalFactsByRelationship =
                groupFactsByRelationship(
                    renewalFacts,
                    requested,
                    "renewal"
                );

            return relationshipIds.map(
                relationshipId=>{
                    const analytics =
                        createInsuranceRelationshipAcquisitionAnalytics({
                            relationshipId,

                            acquisitionCosts:
                                acquisitionCostsByRelationship.get(
                                    relationshipId
                                ) ?? [],

                            premiumFacts:
                                premiumFactsByRelationship.get(
                                    relationshipId
                                ) ?? [],

                            commissionFacts:
                                commissionFactsByRelationship.get(
                                    relationshipId
                                ) ?? [],

                            renewalFacts:
                                renewalFactsByRelationship.get(
                                    relationshipId
                                ) ?? []
                        });

                    const presentation =
                        presentationsByRelationship.get(
                            relationshipId
                        );

                    return {
                        relationshipId,
                        analytics,

                        ...(presentation !== undefined
                            ? {
                                presentation
                            }
                            : {})
                    };
                }
            );
        }
    };
}


export function createD1InsuranceAttributedEconomicsBatchApplication(
    database:
        RiverCrmD1Database
): InsuranceAttributedEconomicsBatchApplication {
    return createInsuranceAttributedEconomicsBatchApplication(
        createD1InsuranceLeadPresentationPersistence(
            database
        ),
        createD1InsuranceAcquisitionEconomicsPersistence(
            database
        )
    );
}
