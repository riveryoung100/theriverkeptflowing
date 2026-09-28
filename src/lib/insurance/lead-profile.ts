import type {
    RiverCrmRelationship
} from "../river-os/crm-workspace";

export type InsuranceLeadRelationshipId =
    RiverCrmRelationship["relationshipId"];

export const INSURANCE_PRODUCT_INTERESTS = [
    "auto",
    "home",
    "renters",
    "landlord",
    "umbrella",
    "life",
    "commercial",
    "other"
] as const;

export type InsuranceProductInterest =
    typeof INSURANCE_PRODUCT_INTERESTS[number];

export const INSURANCE_QUOTE_STATUSES = [
    "not-started",
    "requested",
    "in-progress",
    "quoted",
    "bound",
    "declined",
    "lost"
] as const;

export type InsuranceQuoteStatus =
    typeof INSURANCE_QUOTE_STATUSES[number];

export interface InsuranceLeadProfile {
    readonly relationshipId:
        InsuranceLeadRelationshipId;
    readonly state:
        string;
    readonly postalCode:
        string;
    readonly productInterest:
        InsuranceProductInterest;
    readonly quoteStatus:
        InsuranceQuoteStatus;
    readonly assignedProducer?:
        string;
    readonly createdAt:
        string;
    readonly updatedAt:
        string;
}

export interface CreateInsuranceLeadProfileInput {
    readonly relationshipId:
        unknown;
    readonly state:
        unknown;
    readonly postalCode:
        unknown;
    readonly productInterest:
        unknown;
    readonly quoteStatus:
        unknown;
    readonly assignedProducer?:
        unknown;
    readonly createdAt:
        unknown;
    readonly updatedAt:
        unknown;
}

const US_STATE_CODES =
    new Set([
        "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
        "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
        "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
        "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
        "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
        "DC"
    ]);

function requiredText(
    value: unknown,
    field: string
): string {
    if(typeof value !== "string"){
        throw new TypeError(
            `Insurance lead profile requires ${field} to be text.`
        );
    }

    const normalized =
        value.trim();

    if(normalized.length === 0){
        throw new TypeError(
            `Insurance lead profile requires ${field}.`
        );
    }

    return normalized;
}

function optionalText(
    value: unknown,
    field: string
): string | undefined {
    if(
        value === undefined ||
        value === null ||
        value === ""
    ){
        return undefined;
    }

    if(typeof value !== "string"){
        throw new TypeError(
            `Insurance lead profile requires ${field} to be text when provided.`
        );
    }

    const normalized =
        value.trim();

    return normalized.length === 0
        ? undefined
        : normalized;
}

function canonicalRelationshipId(
    value: unknown
): InsuranceLeadRelationshipId {
    const normalized =
        requiredText(
            value,
            "relationship identity"
        );

    if(
        !normalized.startsWith(
            "relationship:"
        ) ||
        normalized.length <=
            "relationship:".length
    ){
        throw new TypeError(
            "Insurance lead profile requires a valid canonical River CRM relationship identity."
        );
    }

    return normalized as
        InsuranceLeadRelationshipId;
}

function timestamp(
    value: unknown,
    field: string
): string {
    if(typeof value !== "string"){
        throw new TypeError(
            `Insurance lead profile requires ${field} to be a valid timestamp.`
        );
    }

    const parsed =
        new Date(
            value.trim()
        );

    if(Number.isNaN(parsed.getTime())){
        throw new TypeError(
            `Insurance lead profile requires ${field} to be a valid timestamp.`
        );
    }

    return parsed.toISOString();
}

function enumValue<
    const T extends readonly string[]
>(
    value: unknown,
    allowed: T,
    field: string
): T[number] {
    const normalized =
        requiredText(
            value,
            field
        );

    if(
        !allowed.includes(
            normalized as T[number]
        )
    ){
        throw new TypeError(
            `Insurance lead profile ${field} is not supported.`
        );
    }

    return normalized as
        T[number];
}

function stateCode(
    value: unknown
): string {
    const normalized =
        requiredText(
            value,
            "state"
        ).toUpperCase();

    if(!US_STATE_CODES.has(normalized)){
        throw new TypeError(
            "Insurance lead profile requires a valid two-letter US state code."
        );
    }

    return normalized;
}

function postalCode(
    value: unknown
): string {
    const normalized =
        requiredText(
            value,
            "postalCode"
        );

    if(
        !/^\d{5}(?:-\d{4})?$/.test(
            normalized
        )
    ){
        throw new TypeError(
            "Insurance lead profile requires a valid ZIP or ZIP+4."
        );
    }

    return normalized;
}

export function createInsuranceLeadProfile(
    input:
        CreateInsuranceLeadProfileInput
): InsuranceLeadProfile {
    const createdAt =
        timestamp(
            input.createdAt,
            "createdAt"
        );

    const updatedAt =
        timestamp(
            input.updatedAt,
            "updatedAt"
        );

    if(
        new Date(updatedAt).getTime() <
        new Date(createdAt).getTime()
    ){
        throw new TypeError(
            "Insurance lead profile requires updatedAt not to precede createdAt."
        );
    }

    const assignedProducer =
        optionalText(
            input.assignedProducer,
            "assignedProducer"
        );

    return {
        relationshipId:
            canonicalRelationshipId(
                input.relationshipId
            ),
        state:
            stateCode(
                input.state
            ),
        postalCode:
            postalCode(
                input.postalCode
            ),
        productInterest:
            enumValue(
                input.productInterest,
                INSURANCE_PRODUCT_INTERESTS,
                "productInterest"
            ),
        quoteStatus:
            enumValue(
                input.quoteStatus,
                INSURANCE_QUOTE_STATUSES,
                "quoteStatus"
            ),
        ...(assignedProducer !== undefined
            ? { assignedProducer }
            : {}),
        createdAt,
        updatedAt
    };
}
