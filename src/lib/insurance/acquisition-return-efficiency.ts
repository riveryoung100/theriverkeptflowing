export const INSURANCE_ACQUISITION_RETURN_EFFICIENCY_VERSION =
    "insurance-acquisition-return-efficiency-v1" as const;


export interface InsuranceAcquisitionReturnEfficiencyCurrencyInput {
    readonly currency:
        string;

    readonly acquisitionCostMinorUnits:
        number;

    readonly realizedCommissionMinorUnits:
        number;

    readonly contributionMarginMinorUnits:
        number;
}


export interface InsuranceAcquisitionReturnEfficiencyRatio {
    readonly numeratorMinorUnits:
        number;

    readonly denominatorMinorUnits:
        number;
}


export interface InsuranceAcquisitionReturnEfficiencyCurrency {
    readonly currency:
        string;

    readonly acquisitionCostMinorUnits:
        number;

    readonly realizedCommissionMinorUnits:
        number;

    readonly contributionMarginMinorUnits:
        number;

    readonly realizedCommissionToAcquisitionCost?:
        InsuranceAcquisitionReturnEfficiencyRatio;

    readonly contributionToAcquisitionCost?:
        InsuranceAcquisitionReturnEfficiencyRatio;
}


export interface InsuranceAcquisitionReturnEfficiency {
    readonly projectionVersion:
        typeof INSURANCE_ACQUISITION_RETURN_EFFICIENCY_VERSION;

    readonly currencies:
        readonly InsuranceAcquisitionReturnEfficiencyCurrency[];
}


export interface CreateInsuranceAcquisitionReturnEfficiencyInput {
    readonly currencies:
        readonly InsuranceAcquisitionReturnEfficiencyCurrencyInput[];
}


function requireCurrency(
    value:
        unknown
): string {
    if(
        typeof value !== "string" ||
        !/^[A-Z]{3}$/.test(value)
    ){
        throw new TypeError(
            "Insurance acquisition return efficiency requires canonical uppercase three-letter currency codes."
        );
    }

    return value;
}


function requireSafeNonNegativeInteger(
    value:
        unknown,
    field:
        string
): number {
    if(
        typeof value !== "number" ||
        !Number.isSafeInteger(
            value
        ) ||
        value < 0
    ){
        throw new TypeError(
            `Insurance acquisition return efficiency requires ${field} to be a safe non-negative integer.`
        );
    }

    return value;
}


function requireSafeSignedInteger(
    value:
        unknown,
    field:
        string
): number {
    if(
        typeof value !== "number" ||
        !Number.isSafeInteger(
            value
        )
    ){
        throw new TypeError(
            `Insurance acquisition return efficiency requires ${field} to be a safe signed integer.`
        );
    }

    return value;
}


function exactReturnRatio(
    numeratorMinorUnits:
        number,
    denominatorMinorUnits:
        number
): InsuranceAcquisitionReturnEfficiencyRatio | undefined {
    if(denominatorMinorUnits === 0){
        return undefined;
    }

    return {
        numeratorMinorUnits,
        denominatorMinorUnits
    };
}


export function createInsuranceAcquisitionReturnEfficiency(
    input:
        CreateInsuranceAcquisitionReturnEfficiencyInput
): InsuranceAcquisitionReturnEfficiency {
    const currencies:
        InsuranceAcquisitionReturnEfficiencyCurrency[] = [];

    const seen =
        new Set<string>();

    for(const rawCurrency of input.currencies){
        const currency =
            requireCurrency(
                rawCurrency.currency
            );

        if(seen.has(currency)){
            throw new TypeError(
                `Insurance acquisition return efficiency received duplicate currency ${currency}.`
            );
        }

        seen.add(
            currency
        );

        const acquisitionCostMinorUnits =
            requireSafeNonNegativeInteger(
                rawCurrency.acquisitionCostMinorUnits,
                "acquisitionCostMinorUnits"
            );

        const realizedCommissionMinorUnits =
            requireSafeSignedInteger(
                rawCurrency.realizedCommissionMinorUnits,
                "realizedCommissionMinorUnits"
            );

        const contributionMarginMinorUnits =
            requireSafeSignedInteger(
                rawCurrency.contributionMarginMinorUnits,
                "contributionMarginMinorUnits"
            );

        const realizedCommissionToAcquisitionCost =
            exactReturnRatio(
                realizedCommissionMinorUnits,
                acquisitionCostMinorUnits
            );

        const contributionToAcquisitionCost =
            exactReturnRatio(
                contributionMarginMinorUnits,
                acquisitionCostMinorUnits
            );

        currencies.push({
            currency,
            acquisitionCostMinorUnits,
            realizedCommissionMinorUnits,
            contributionMarginMinorUnits,

            ...(realizedCommissionToAcquisitionCost !== undefined
                ? {
                    realizedCommissionToAcquisitionCost
                }
                : {}),

            ...(contributionToAcquisitionCost !== undefined
                ? {
                    contributionToAcquisitionCost
                }
                : {})
        });
    }

    currencies.sort(
        (
            left,
            right
        ) =>
            left.currency <
            right.currency
                ? -1
                : left.currency >
                    right.currency
                    ? 1
                    : 0
    );

    return {
        projectionVersion:
            INSURANCE_ACQUISITION_RETURN_EFFICIENCY_VERSION,

        currencies
    };
}
