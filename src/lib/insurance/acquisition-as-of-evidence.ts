import type {
    InsuranceAcquisitionCostFact,
    InsuranceCommissionFact,
    InsurancePremiumFact,
    InsuranceRenewalFact
} from "./acquisition-economics";

import type {
    InsuranceAcquisitionOutcomeFact
} from "./acquisition-outcomes";


export const INSURANCE_ACQUISITION_AS_OF_EVIDENCE_VERSION =
    "insurance-acquisition-as-of-evidence-v1" as const;


export interface CreateInsuranceAcquisitionAsOfEvidenceInput {
    readonly asOfExclusive:
        string;

    readonly acquisitionCosts?:
        readonly InsuranceAcquisitionCostFact[];

    readonly premiumFacts?:
        readonly InsurancePremiumFact[];

    readonly commissionFacts?:
        readonly InsuranceCommissionFact[];

    readonly renewalFacts?:
        readonly InsuranceRenewalFact[];

    readonly outcomeFacts?:
        readonly InsuranceAcquisitionOutcomeFact[];
}


export interface InsuranceAcquisitionAsOfEvidence {
    readonly projectionVersion:
        typeof INSURANCE_ACQUISITION_AS_OF_EVIDENCE_VERSION;

    readonly asOfExclusive:
        string;

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


function requireCanonicalUtcTimestamp(
    value:
        unknown
): string {
    if(
        typeof value !== "string" ||
        value.length === 0
    ){
        throw new TypeError(
            "Insurance acquisition as-of evidence requires asOfExclusive to be a canonical UTC timestamp."
        );
    }

    const parsed =
        Date.parse(
            value
        );

    if(
        Number.isNaN(
            parsed
        )
    ){
        throw new TypeError(
            "Insurance acquisition as-of evidence requires asOfExclusive to be a canonical UTC timestamp."
        );
    }

    const canonical =
        new Date(
            parsed
        ).toISOString();

    if(canonical !== value){
        throw new TypeError(
            "Insurance acquisition as-of evidence requires asOfExclusive to be a canonical UTC timestamp."
        );
    }

    return value;
}


function occurredBefore(
    occurredAt:
        string,
    cutoffMilliseconds:
        number
): boolean {
    const occurredMilliseconds =
        Date.parse(
            occurredAt
        );

    if(
        Number.isNaN(
            occurredMilliseconds
        )
    ){
        throw new TypeError(
            "Insurance acquisition as-of evidence requires valid fact occurredAt timestamps."
        );
    }

    return occurredMilliseconds <
        cutoffMilliseconds;
}


function filterOccurredBefore<
    T extends {
        readonly occurredAt:
            string;
    }
>(
    values:
        readonly T[] | undefined,
    cutoffMilliseconds:
        number
): readonly T[] {
    return (
        values ??
        []
    ).filter(
        value =>
            occurredBefore(
                value.occurredAt,
                cutoffMilliseconds
            )
    );
}


export function createInsuranceAcquisitionAsOfEvidence(
    input:
        CreateInsuranceAcquisitionAsOfEvidenceInput
): InsuranceAcquisitionAsOfEvidence {
    const asOfExclusive =
        requireCanonicalUtcTimestamp(
            input.asOfExclusive
        );

    const cutoffMilliseconds =
        Date.parse(
            asOfExclusive
        );

    return {
        projectionVersion:
            INSURANCE_ACQUISITION_AS_OF_EVIDENCE_VERSION,

        asOfExclusive,

        acquisitionCosts:
            filterOccurredBefore(
                input.acquisitionCosts,
                cutoffMilliseconds
            ),

        premiumFacts:
            filterOccurredBefore(
                input.premiumFacts,
                cutoffMilliseconds
            ),

        commissionFacts:
            filterOccurredBefore(
                input.commissionFacts,
                cutoffMilliseconds
            ),

        renewalFacts:
            filterOccurredBefore(
                input.renewalFacts,
                cutoffMilliseconds
            ),

        outcomeFacts:
            filterOccurredBefore(
                input.outcomeFacts,
                cutoffMilliseconds
            )
    };
}
