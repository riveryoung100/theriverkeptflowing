import {
    createRiverCrmRelationship
} from "../river-os/crm-workspace";

import type {
    RiverCrmRelationship
} from "../river-os/crm-workspace";

import {
    createRiverCrmAcquisitionAttribution,
    createRiverCrmContactConsent,
    createRiverCrmRelationshipEvent
} from "../river-os/crm-growth-contracts";

import type {
    RiverCrmAcquisitionAttribution,
    RiverCrmContactConsent,
    RiverCrmRelationshipEvent
} from "../river-os/crm-growth-contracts";

import {
    createInsuranceLeadProfile,
    INSURANCE_PRODUCT_INTERESTS
} from "./lead-profile";

import type {
    InsuranceLeadProfile,
    InsuranceProductInterest
} from "./lead-profile";


export interface InsuranceQuoteRequestDependencies {
    readonly now:
        () => string;

    readonly createUuid:
        () => string;
}

export interface InsuranceQuoteRequestRecords {
    readonly relationship:
        RiverCrmRelationship;

    readonly acquisition:
        RiverCrmAcquisitionAttribution;

    readonly insuranceProfile:
        InsuranceLeadProfile;

    readonly consents:
        readonly RiverCrmContactConsent[];

    readonly events:
        readonly RiverCrmRelationshipEvent[];
}

interface PublicConsentInput {
    readonly phone?:
        boolean;

    readonly sms?:
        boolean;

    readonly email?:
        boolean;

    readonly textVersion:
        string;
}

interface ParsedQuoteRequest {
    readonly firstName:
        string;

    readonly lastName:
        string;

    readonly phone?:
        string;

    readonly email?:
        string;

    readonly state:
        string;

    readonly postalCode:
        string;

    readonly productInterest:
        InsuranceProductInterest;

    readonly consent:
        PublicConsentInput;

    readonly sourceVendor?:
        string;

    readonly campaign?:
        string;

    readonly adOrCreativeId?:
        string;

    readonly landingPage?:
        string;

    readonly utmSource?:
        string;

    readonly utmMedium?:
        string;

    readonly utmCampaign?:
        string;

    readonly utmTerm?:
        string;

    readonly utmContent?:
        string;

    readonly referralSource?:
        string;
}

const PUBLIC_KEYS =
    new Set([
        "firstName",
        "lastName",
        "phone",
        "email",
        "state",
        "postalCode",
        "productInterest",
        "consent",
        "sourceVendor",
        "campaign",
        "adOrCreativeId",
        "landingPage",
        "utmSource",
        "utmMedium",
        "utmCampaign",
        "utmTerm",
        "utmContent",
        "referralSource"
    ]);

const CONSENT_KEYS =
    new Set([
        "phone",
        "sms",
        "email",
        "textVersion"
    ]);

const FORBIDDEN_KEYS =
    new Set([
        "relationshipId",
        "kind",
        "stage",
        "owner",
        "assignedProducer",
        "quoteStatus",
        "createdAt",
        "updatedAt",
        "eventId",
        "consentId",
        "ssn",
        "socialSecurityNumber",
        "driverLicense",
        "driverLicenseNumber",
        "paymentCard",
        "bankAccount",
        "carrierCredential",
        "carrierPassword"
    ]);


function recordValue(
    value: unknown,
    field: string
): Record<string, unknown> {
    if(
        typeof value !== "object" ||
        value === null ||
        Array.isArray(value)
    ){
        throw new TypeError(
            `Insurance quote request requires ${field} to be an object.`
        );
    }

    return value as
        Record<string, unknown>;
}

function requiredText(
    value: unknown,
    field: string
): string {
    if(typeof value !== "string"){
        throw new TypeError(
            `Insurance quote request requires ${field}.`
        );
    }

    const normalized =
        value.trim();

    if(normalized.length === 0){
        throw new TypeError(
            `Insurance quote request requires ${field}.`
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
        value === null
    ){
        return undefined;
    }

    if(typeof value !== "string"){
        throw new TypeError(
            `Insurance quote request requires ${field} to be text when provided.`
        );
    }

    const normalized =
        value.trim();

    return normalized.length === 0
        ? undefined
        : normalized;
}

function optionalBoolean(
    value: unknown,
    field: string
): boolean | undefined {
    if(value === undefined){
        return undefined;
    }

    if(typeof value !== "boolean"){
        throw new TypeError(
            `Insurance quote request requires ${field} consent to be boolean.`
        );
    }

    return value;
}

function normalizeEmail(
    value: unknown
): string | undefined {
    const normalized =
        optionalText(
            value,
            "email"
        );

    if(normalized === undefined){
        return undefined;
    }

    const lower =
        normalized.toLowerCase();

    if(
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            lower
        )
    ){
        throw new TypeError(
            "Insurance quote request requires a valid email."
        );
    }

    return lower;
}

function normalizePhone(
    value: unknown
): string | undefined {
    const normalized =
        optionalText(
            value,
            "phone"
        );

    if(normalized === undefined){
        return undefined;
    }

    const digits =
        normalized.replace(
            /\D/g,
            ""
        );

    if(
        digits.length < 7 ||
        digits.length > 15
    ){
        throw new TypeError(
            "Insurance quote request requires a usable phone number."
        );
    }

    return normalized;
}

function productInterest(
    value: unknown
): InsuranceProductInterest {
    if(
        typeof value !== "string" ||
        !(
            INSURANCE_PRODUCT_INTERESTS as
                readonly string[]
        ).includes(value)
    ){
        throw new TypeError(
            "Insurance quote request product interest is not supported."
        );
    }

    return value as
        InsuranceProductInterest;
}

function assertAllowedKeys(
    value: Record<string, unknown>,
    allowed: ReadonlySet<string>,
    context: string
): void {
    for(const key of Object.keys(value)){
        if(FORBIDDEN_KEYS.has(key)){
            throw new TypeError(
                `Insurance quote request forbids public field ${key}.`
            );
        }

        if(!allowed.has(key)){
            throw new TypeError(
                `Insurance quote request does not support ${context} field ${key}.`
            );
        }
    }
}

function parseConsent(
    value: unknown,
    phone: string | undefined,
    email: string | undefined
): PublicConsentInput {
    const consent =
        recordValue(
            value,
            "consent"
        );

    assertAllowedKeys(
        consent,
        CONSENT_KEYS,
        "consent"
    );

    const textVersion =
        requiredText(
            consent.textVersion,
            "consent.textVersion"
        );

    const phoneConsent =
        optionalBoolean(
            consent.phone,
            "phone"
        );

    const smsConsent =
        optionalBoolean(
            consent.sms,
            "sms"
        );

    const emailConsent =
        optionalBoolean(
            consent.email,
            "email"
        );

    if(
        phone !== undefined &&
        phoneConsent === undefined
    ){
        throw new TypeError(
            "Insurance quote request requires explicit phone consent when phone is supplied."
        );
    }

    if(
        email !== undefined &&
        emailConsent === undefined
    ){
        throw new TypeError(
            "Insurance quote request requires explicit email consent when email is supplied."
        );
    }

    if(
        phone === undefined &&
        (
            phoneConsent === true ||
            smsConsent === true
        )
    ){
        throw new TypeError(
            "Insurance quote request cannot grant phone or SMS consent without a phone number."
        );
    }

    if(
        email === undefined &&
        emailConsent === true
    ){
        throw new TypeError(
            "Insurance quote request cannot grant email consent without an email address."
        );
    }

    const granted =
        phoneConsent === true ||
        smsConsent === true ||
        emailConsent === true;

    if(!granted){
        throw new TypeError(
            "Insurance quote request requires at least one granted contact channel."
        );
    }

    return {
        ...(phoneConsent !== undefined
            ? {
                phone:
                    phoneConsent
            }
            : {}),
        ...(smsConsent !== undefined
            ? {
                sms:
                    smsConsent
            }
            : {}),
        ...(emailConsent !== undefined
            ? {
                email:
                    emailConsent
            }
            : {}),
        textVersion
    };
}

function parsePublicQuoteRequest(
    input: unknown
): ParsedQuoteRequest {
    const request =
        recordValue(
            input,
            "request body"
        );

    assertAllowedKeys(
        request,
        PUBLIC_KEYS,
        "request"
    );

    const firstName =
        requiredText(
            request.firstName,
            "firstName"
        );

    const lastName =
        requiredText(
            request.lastName,
            "lastName"
        );

    const phone =
        normalizePhone(
            request.phone
        );

    const email =
        normalizeEmail(
            request.email
        );

    if(
        phone === undefined &&
        email === undefined
    ){
        throw new TypeError(
            "Insurance quote request requires phone or email."
        );
    }

    const consent =
        parseConsent(
            request.consent,
            phone,
            email
        );

    return {
        firstName,
        lastName,
        ...(phone !== undefined
            ? { phone }
            : {}),
        ...(email !== undefined
            ? { email }
            : {}),
        state:
            requiredText(
                request.state,
                "state"
            ),
        postalCode:
            requiredText(
                request.postalCode,
                "postalCode"
            ),
        productInterest:
            productInterest(
                request.productInterest
            ),
        consent,
        ...optionalAttribution(
            request
        )
    };
}

function optionalAttribution(
    request:
        Record<string, unknown>
): Partial<
    Pick<
        ParsedQuoteRequest,
        | "sourceVendor"
        | "campaign"
        | "adOrCreativeId"
        | "landingPage"
        | "utmSource"
        | "utmMedium"
        | "utmCampaign"
        | "utmTerm"
        | "utmContent"
        | "referralSource"
    >
> {
    const keys = [
        "sourceVendor",
        "campaign",
        "adOrCreativeId",
        "landingPage",
        "utmSource",
        "utmMedium",
        "utmCampaign",
        "utmTerm",
        "utmContent",
        "referralSource"
    ] as const;

    const result:
        Record<string, string> = {};

    for(const key of keys){
        const normalized =
            optionalText(
                request[key],
                key
            );

        if(normalized !== undefined){
            result[key] =
                normalized;
        }
    }

    return result;
}

function uuid(
    dependencies:
        InsuranceQuoteRequestDependencies
): string {
    const value =
        dependencies
            .createUuid()
            .trim();

    if(value.length === 0){
        throw new TypeError(
            "Insurance quote request identifier dependency returned an empty value."
        );
    }

    return value;
}

function serverTimestamp(
    dependencies:
        InsuranceQuoteRequestDependencies
): string {
    const value =
        dependencies
            .now()
            .trim();

    if(
        value.length === 0 ||
        Number.isNaN(
            new Date(value).getTime()
        )
    ){
        throw new TypeError(
            "Insurance quote request timestamp dependency returned an invalid timestamp."
        );
    }

    return value;
}

export function buildInsuranceQuoteRequestRecords(
    input: unknown,
    dependencies:
        InsuranceQuoteRequestDependencies
): InsuranceQuoteRequestRecords {
    const request =
        parsePublicQuoteRequest(
            input
        );

    const timestamp =
        serverTimestamp(
            dependencies
        );

    const relationshipId =
        `relationship:${uuid(
            dependencies
        )}`;

    const relationship =
        createRiverCrmRelationship({
            relationshipId,
            displayName:
                `${request.firstName} ${request.lastName}`,
            kind:
                "lead",
            stage:
                "new",
            source:
                "website",
            ...(request.email !== undefined
                ? {
                    email:
                        request.email
                }
                : {}),
            ...(request.phone !== undefined
                ? {
                    phone:
                        request.phone
                }
                : {}),
            createdAt:
                timestamp,
            updatedAt:
                timestamp
        });

    const acquisition =
        createRiverCrmAcquisitionAttribution({
            relationshipId,
            source:
                "website",
            capturedAt:
                timestamp,
            updatedAt:
                timestamp,
            ...(request.sourceVendor !== undefined
                ? {
                    sourceVendor:
                        request.sourceVendor
                }
                : {}),
            ...(request.campaign !== undefined
                ? {
                    campaign:
                        request.campaign
                }
                : {}),
            ...(request.adOrCreativeId !== undefined
                ? {
                    adOrCreativeId:
                        request.adOrCreativeId
                }
                : {}),
            ...(request.landingPage !== undefined
                ? {
                    landingPage:
                        request.landingPage
                }
                : {}),
            ...(request.utmSource !== undefined
                ? {
                    utmSource:
                        request.utmSource
                }
                : {}),
            ...(request.utmMedium !== undefined
                ? {
                    utmMedium:
                        request.utmMedium
                }
                : {}),
            ...(request.utmCampaign !== undefined
                ? {
                    utmCampaign:
                        request.utmCampaign
                }
                : {}),
            ...(request.utmTerm !== undefined
                ? {
                    utmTerm:
                        request.utmTerm
                }
                : {}),
            ...(request.utmContent !== undefined
                ? {
                    utmContent:
                        request.utmContent
                }
                : {}),
            ...(request.referralSource !== undefined
                ? {
                    referralSource:
                        request.referralSource
                }
                : {})
        });

    const insuranceProfile =
        createInsuranceLeadProfile({
            relationshipId,
            state:
                request.state,
            postalCode:
                request.postalCode,
            productInterest:
                request.productInterest,
            quoteStatus:
                "requested",
            createdAt:
                timestamp,
            updatedAt:
                timestamp
        });

    const consents:
        RiverCrmContactConsent[] = [];

    if(request.phone !== undefined){
        consents.push(
            createRiverCrmContactConsent({
                consentId:
                    `consent:${uuid(
                        dependencies
                    )}`,
                relationshipId,
                channel:
                    "phone",
                status:
                    request.consent.phone === true
                        ? "granted"
                        : "denied",
                consentTextVersion:
                    request.consent.textVersion,
                consentSource:
                    "website",
                capturedAt:
                    timestamp,
                doNotContact:
                    false,
                createdAt:
                    timestamp,
                updatedAt:
                    timestamp
            })
        );
    }

    if(
        request.phone !== undefined &&
        request.consent.sms !== undefined
    ){
        consents.push(
            createRiverCrmContactConsent({
                consentId:
                    `consent:${uuid(
                        dependencies
                    )}`,
                relationshipId,
                channel:
                    "sms",
                status:
                    request.consent.sms
                        ? "granted"
                        : "denied",
                consentTextVersion:
                    request.consent.textVersion,
                consentSource:
                    "website",
                capturedAt:
                    timestamp,
                doNotContact:
                    false,
                createdAt:
                    timestamp,
                updatedAt:
                    timestamp
            })
        );
    }

    if(request.email !== undefined){
        consents.push(
            createRiverCrmContactConsent({
                consentId:
                    `consent:${uuid(
                        dependencies
                    )}`,
                relationshipId,
                channel:
                    "email",
                status:
                    request.consent.email === true
                        ? "granted"
                        : "denied",
                consentTextVersion:
                    request.consent.textVersion,
                consentSource:
                    "website",
                capturedAt:
                    timestamp,
                doNotContact:
                    false,
                createdAt:
                    timestamp,
                updatedAt:
                    timestamp
            })
        );
    }

    const metadata = {
        productInterest:
            insuranceProfile.productInterest,
        state:
            insuranceProfile.state
    };

    const events = [
        createRiverCrmRelationshipEvent({
            eventId:
                `crm-event:${uuid(
                    dependencies
                )}`,
            relationshipId,
            eventType:
                "lead-created",
            occurredAt:
                timestamp,
            source:
                "website",
            metadata
        }),
        createRiverCrmRelationshipEvent({
            eventId:
                `crm-event:${uuid(
                    dependencies
                )}`,
            relationshipId,
            eventType:
                "quote-requested",
            occurredAt:
                timestamp,
            source:
                "website",
            metadata
        })
    ];

    return {
        relationship,
        acquisition,
        insuranceProfile,
        consents,
        events
    };
}
