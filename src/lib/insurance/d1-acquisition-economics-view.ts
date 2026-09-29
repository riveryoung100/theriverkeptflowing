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
    InsuranceLeadPresentation
} from "./lead-presentation";

import {
    createD1InsuranceLeadPresentationPersistence
} from "./d1-lead-presentation";

import type {
    InsuranceRelationshipAcquisitionAnalytics
} from "./acquisition-analytics";

import {
    createD1InsuranceRelationshipAcquisitionAnalyticsApplication
} from "./d1-acquisition-analytics";

import type {
    InsuranceRelationshipAcquisitionAnalyticsApplication
} from "./d1-acquisition-analytics";


export interface InsuranceLeadPresentationReader {
    listForRelationships(
        relationshipIds:
            readonly RiverCrmRelationshipId[]
    ): Promise<
        readonly InsuranceLeadPresentation[]
    >;
}


export interface InsuranceAttributedRelationshipEconomicsView {
    readonly relationshipId:
        RiverCrmRelationshipId;

    readonly analytics:
        InsuranceRelationshipAcquisitionAnalytics;

    readonly presentation?:
        InsuranceLeadPresentation;
}


export interface InsuranceAttributedRelationshipEconomicsApplication {
    getRelationshipEconomicsView(
        relationshipId:
            RiverCrmRelationshipId
    ): Promise<
        InsuranceAttributedRelationshipEconomicsView
    >;
}


export function createInsuranceAttributedRelationshipEconomicsApplication(
    presentationReader:
        InsuranceLeadPresentationReader,
    analyticsApplication:
        InsuranceRelationshipAcquisitionAnalyticsApplication
): InsuranceAttributedRelationshipEconomicsApplication {
    return {
        async getRelationshipEconomicsView(
            relationshipId
        ){
            const canonicalRelationshipId =
                requireRiverCrmRelationshipId(
                    relationshipId
                );

            const [
                presentations,
                analytics
            ] =
                await Promise.all([
                    presentationReader
                        .listForRelationships([
                            canonicalRelationshipId
                        ]),

                    analyticsApplication
                        .getRelationshipAnalytics(
                            canonicalRelationshipId
                        )
                ]);

            if(
                analytics.relationshipId !==
                canonicalRelationshipId
            ){
                throw new TypeError(
                    "Attributed relationship economics analytics relationship mismatch."
                );
            }

            for(const presentation of presentations){
                if(
                    presentation.relationshipId !==
                    canonicalRelationshipId
                ){
                    throw new TypeError(
                        "Attributed relationship economics presentation relationship mismatch."
                    );
                }
            }

            if(presentations.length > 1){
                throw new Error(
                    "Attributed relationship economics requires at most one insurance presentation per relationship."
                );
            }

            const presentation =
                presentations[0];

            return {
                relationshipId:
                    canonicalRelationshipId,

                analytics,

                ...(presentation !== undefined
                    ? {
                        presentation
                    }
                    : {})
            };
        }
    };
}


export function createD1InsuranceAttributedRelationshipEconomicsApplication(
    database:
        RiverCrmD1Database
): InsuranceAttributedRelationshipEconomicsApplication {
    return createInsuranceAttributedRelationshipEconomicsApplication(
        createD1InsuranceLeadPresentationPersistence(
            database
        ),
        createD1InsuranceRelationshipAcquisitionAnalyticsApplication(
            database
        )
    );
}
