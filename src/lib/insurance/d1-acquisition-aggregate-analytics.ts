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

import {
    createInsuranceAcquisitionAggregateAnalytics
} from "./acquisition-aggregate-analytics";

import type {
    InsuranceAcquisitionAggregateAnalytics,
    InsuranceAcquisitionAggregateDimension
} from "./acquisition-aggregate-analytics";


export interface InsuranceAcquisitionAggregatePresentationReader {
    listForRelationships(
        relationshipIds:
            readonly RiverCrmRelationshipId[]
    ): Promise<
        readonly InsuranceLeadPresentation[]
    >;
}


export interface InsuranceAcquisitionAggregateEconomicsReader {
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


export interface GetInsuranceAcquisitionAggregateAnalyticsInput {
    readonly dimension:
        InsuranceAcquisitionAggregateDimension;

    readonly relationshipIds:
        readonly RiverCrmRelationshipId[];
}


export interface InsuranceAcquisitionAggregateAnalyticsApplication {
    getAggregateAnalytics(
        input:
            GetInsuranceAcquisitionAggregateAnalyticsInput
    ): Promise<
        InsuranceAcquisitionAggregateAnalytics
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
                "Insurance aggregate presentation reader returned a relationship outside the requested cohort."
            );
        }

        if(result.has(relationshipId)){
            throw new TypeError(
                "Insurance aggregate requires at most one presentation per requested relationship."
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
                `Insurance aggregate ${factType} reader returned a relationship outside the requested cohort.`
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


export function createInsuranceAcquisitionAggregateAnalyticsApplication(
    presentationReader:
        InsuranceAcquisitionAggregatePresentationReader,
    economicsReader:
        InsuranceAcquisitionAggregateEconomicsReader
): InsuranceAcquisitionAggregateAnalyticsApplication {
    return {
        async getAggregateAnalytics(
            input
        ){
            const emptyProjection =
                createInsuranceAcquisitionAggregateAnalytics({
                    dimension:
                        input.dimension,
                    views:
                        []
                });

            const relationshipIds =
                canonicalRequestedRelationshipIds(
                    input.relationshipIds
                );

            if(relationshipIds.length === 0){
                return emptyProjection;
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

                    economicsReader
                        .listAcquisitionCostsForRelationships(
                            relationshipIds
                        ),

                    economicsReader
                        .listPremiumFactsForRelationships(
                            relationshipIds
                        ),

                    economicsReader
                        .listCommissionFactsForRelationships(
                            relationshipIds
                        ),

                    economicsReader
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

            const views:
                InsuranceAttributedRelationshipEconomicsView[] =
                relationshipIds.map(
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

            return createInsuranceAcquisitionAggregateAnalytics({
                dimension:
                    emptyProjection.dimension,
                views
            });
        }
    };
}


export function createD1InsuranceAcquisitionAggregateAnalyticsApplication(
    database:
        RiverCrmD1Database
): InsuranceAcquisitionAggregateAnalyticsApplication {
    return createInsuranceAcquisitionAggregateAnalyticsApplication(
        createD1InsuranceLeadPresentationPersistence(
            database
        ),
        createD1InsuranceAcquisitionEconomicsPersistence(
            database
        )
    );
}
