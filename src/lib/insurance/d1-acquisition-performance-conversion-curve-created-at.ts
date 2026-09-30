import {
    requireRiverCrmRelationshipId
} from "../river-os/crm-actions";

import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";

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
    createInsuranceAcquisitionConversionWindowEvidence,
    requireInsuranceAcquisitionConversionWindowDays
} from "./acquisition-conversion-window-evidence";

import {
    createInsuranceAttributedEconomicsBatchApplication
} from "./d1-attributed-economics-batch";

import {
    createD1InsuranceAcquisitionRawEvidenceBatchApplication
} from "./d1-acquisition-raw-evidence-batch";

import type {
    InsuranceAcquisitionRawEvidenceBatchApplication
} from "./d1-acquisition-raw-evidence-batch";

import {
    canonicalInsuranceAcquisitionPerformanceDimensions,
    projectInsuranceAcquisitionPerformanceDimensions
} from "./d1-acquisition-performance-snapshot-created-at-cohort";

import type {
    InsuranceAcquisitionPerformanceDimensionProjection
} from "./d1-acquisition-performance-snapshot-created-at-cohort";


export const INSURANCE_ACQUISITION_CREATED_AT_CONVERSION_CURVE_VERSION =
    "insurance-acquisition-created-at-conversion-curve-v1" as const;


export interface InsuranceAcquisitionCreatedAtConversionCurveCohortReader {
    listCreatedAtRange(
        query:
            RiverCrmCreatedAtCohortQuery
    ): Promise<
        readonly {
            readonly relationshipId:
                string;

            readonly createdAt:
                string;
        }[]
    >;
}


export interface GetInsuranceAcquisitionCreatedAtConversionCurveInput {
    readonly createdAtFromInclusive:
        string;

    readonly createdAtToExclusive:
        string;

    readonly asOfExclusive:
        string;

    readonly windowDays:
        readonly number[];

    readonly dimensions:
        readonly InsuranceAcquisitionAggregateDimension[];

    readonly limit?:
        number;
}


export interface InsuranceAcquisitionCreatedAtConversionCurveWindow {
    readonly windowDays:
        number;

    readonly matureRelationshipCount:
        number;

    readonly immatureRelationshipCount:
        number;

    readonly dimensions:
        readonly InsuranceAcquisitionPerformanceDimensionProjection[];
}


export interface InsuranceAcquisitionCreatedAtConversionCurve {
    readonly version:
        typeof INSURANCE_ACQUISITION_CREATED_AT_CONVERSION_CURVE_VERSION;

    readonly asOfExclusive:
        string;

    readonly cohortRelationshipCount:
        number;

    readonly windows:
        readonly InsuranceAcquisitionCreatedAtConversionCurveWindow[];
}


export interface InsuranceAcquisitionCreatedAtConversionCurveApplication {
    getCreatedAtConversionCurve(
        input:
            GetInsuranceAcquisitionCreatedAtConversionCurveInput
    ): Promise<
        InsuranceAcquisitionCreatedAtConversionCurve
    >;
}


function canonicalWindowDays(
    values:
        readonly number[]
): readonly number[] {
    if(values.length === 0){
        throw new RangeError(
            "Insurance acquisition conversion curve requires at least one observation window."
        );
    }

    const result:
        number[] = [];

    const seen =
        new Set<number>();

    for(const value of values){
        const windowDays =
            requireInsuranceAcquisitionConversionWindowDays(
                value
            );

        if(seen.has(windowDays)){
            continue;
        }

        seen.add(
            windowDays
        );

        result.push(
            windowDays
        );
    }

    return result;
}


export function createInsuranceAcquisitionCreatedAtConversionCurveApplication(
    cohortReader:
        InsuranceAcquisitionCreatedAtConversionCurveCohortReader,
    rawEvidenceApplication:
        InsuranceAcquisitionRawEvidenceBatchApplication
): InsuranceAcquisitionCreatedAtConversionCurveApplication {
    return {
        async getCreatedAtConversionCurve(
            input
        ){
            const dimensions =
                canonicalInsuranceAcquisitionPerformanceDimensions(
                    input.dimensions
                );

            const windowDays =
                canonicalWindowDays(
                    input.windowDays
                );

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

            const rawRelationships =
                await cohortReader
                    .listCreatedAtRange(
                        cohortQuery
                    );

            const relationships =
                rawRelationships.map(
                    relationship => ({
                        relationshipId:
                            requireRiverCrmRelationshipId(
                                relationship.relationshipId
                            ),

                        createdAt:
                            relationship.createdAt
                    })
                );

            const rawEvidence =
                await rawEvidenceApplication
                    .getEvidence(
                        relationships.map(
                            relationship =>
                                relationship.relationshipId
                        )
                    );

            const windows:
                InsuranceAcquisitionCreatedAtConversionCurveWindow[] = [];

            let cohortRelationshipCount:
                number | undefined;

            let canonicalAsOfExclusive:
                string | undefined;

            for(const observationWindowDays of windowDays){
                const conversionEvidence =
                    createInsuranceAcquisitionConversionWindowEvidence({
                        relationships,

                        asOfExclusive:
                            input.asOfExclusive,

                        windowDays:
                            observationWindowDays,

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

                if(cohortRelationshipCount === undefined){
                    cohortRelationshipCount =
                        conversionEvidence.cohortRelationshipCount;
                }
                else if(
                    cohortRelationshipCount !==
                    conversionEvidence.cohortRelationshipCount
                ){
                    throw new RangeError(
                        "Insurance acquisition conversion curve requires one stable relationship cohort across observation windows."
                    );
                }

                if(canonicalAsOfExclusive === undefined){
                    canonicalAsOfExclusive =
                        conversionEvidence.asOfExclusive;
                }
                else if(
                    canonicalAsOfExclusive !==
                    conversionEvidence.asOfExclusive
                ){
                    throw new RangeError(
                        "Insurance acquisition conversion curve requires one canonical asOfExclusive across observation windows."
                    );
                }

                const matureRelationshipIds =
                    new Set<
                        RiverCrmRelationshipId
                    >(
                        conversionEvidence.relationshipIds
                    );

                const maturePresentations =
                    rawEvidence.presentations.filter(
                        presentation =>
                            matureRelationshipIds.has(
                                presentation.relationshipId
                            )
                    );

                const attributedApplication =
                    createInsuranceAttributedEconomicsBatchApplication(
                        {
                            async listForRelationships(){
                                return maturePresentations;
                            }
                        },
                        {
                            async listAcquisitionCostsForRelationships(){
                                return conversionEvidence.acquisitionCosts;
                            },

                            async listPremiumFactsForRelationships(){
                                return conversionEvidence.premiumFacts;
                            },

                            async listCommissionFactsForRelationships(){
                                return conversionEvidence.commissionFacts;
                            },

                            async listRenewalFactsForRelationships(){
                                return conversionEvidence.renewalFacts;
                            }
                        }
                    );

                const views =
                    await attributedApplication
                        .getViews(
                            conversionEvidence.relationshipIds
                        );

                windows.push({
                    windowDays:
                        conversionEvidence.windowDays,

                    matureRelationshipCount:
                        conversionEvidence.matureRelationshipCount,

                    immatureRelationshipCount:
                        conversionEvidence.immatureRelationshipCount,

                    dimensions:
                        projectInsuranceAcquisitionPerformanceDimensions(
                            dimensions,
                            conversionEvidence.relationshipIds,
                            views,
                            conversionEvidence.outcomeFacts
                        )
                });
            }

            if(
                cohortRelationshipCount === undefined ||
                canonicalAsOfExclusive === undefined
            ){
                throw new Error(
                    "Insurance acquisition conversion curve invariant failed to produce a canonical observation window."
                );
            }

            return {
                version:
                    INSURANCE_ACQUISITION_CREATED_AT_CONVERSION_CURVE_VERSION,

                asOfExclusive:
                    canonicalAsOfExclusive,

                cohortRelationshipCount,

                windows
            };
        }
    };
}


export function createD1InsuranceAcquisitionCreatedAtConversionCurveApplication(
    database:
        RiverCrmD1Database
): InsuranceAcquisitionCreatedAtConversionCurveApplication {
    return createInsuranceAcquisitionCreatedAtConversionCurveApplication(
        createD1RiverCrmPersistence(
            database
        ),
        createD1InsuranceAcquisitionRawEvidenceBatchApplication(
            database
        )
    );
}
