import type {
    RiverCrmRelationship
} from "./crm-workspace";

export type RiverCrmRelationshipId =
    RiverCrmRelationship["relationshipId"];

export type RiverCrmConsentId =
    string;

export type RiverCrmEventId =
    string;

export const RIVER_CRM_CONTACT_CHANNELS = [
    "phone",
    "sms",
    "email"
] as const;

export type RiverCrmContactChannel =
    typeof RIVER_CRM_CONTACT_CHANNELS[number];

export const RIVER_CRM_CONSENT_STATUSES = [
    "granted",
    "denied",
    "revoked",
    "unknown"
] as const;

export type RiverCrmConsentStatus =
    typeof RIVER_CRM_CONSENT_STATUSES[number];

export const RIVER_CRM_EVENT_TYPES = [
    "lead-created",
    "quote-requested",
    "consent-captured",
    "consent-revoked",
    "stage-changed",
    "appointment-set",
    "callback-requested"
] as const;

export type RiverCrmRelationshipEventType =
    typeof RIVER_CRM_EVENT_TYPES[number];

export type RiverCrmJsonValue =
    | null
    | boolean
    | number
    | string
    | readonly RiverCrmJsonValue[]
    | {
        readonly [key: string]:
            RiverCrmJsonValue;
    };

export interface RiverCrmAcquisitionAttribution {
    readonly relationshipId:
        RiverCrmRelationshipId;
    readonly source:
        string;
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
    readonly capturedAt:
        string;
    readonly updatedAt:
        string;
}

export interface CreateRiverCrmAcquisitionAttributionInput {
    readonly relationshipId:
        unknown;
    readonly source:
        unknown;
    readonly sourceVendor?:
        unknown;
    readonly campaign?:
        unknown;
    readonly adOrCreativeId?:
        unknown;
    readonly landingPage?:
        unknown;
    readonly utmSource?:
        unknown;
    readonly utmMedium?:
        unknown;
    readonly utmCampaign?:
        unknown;
    readonly utmTerm?:
        unknown;
    readonly utmContent?:
        unknown;
    readonly referralSource?:
        unknown;
    readonly capturedAt:
        unknown;
    readonly updatedAt:
        unknown;
}

export interface RiverCrmContactConsent {
    readonly consentId:
        RiverCrmConsentId;
    readonly relationshipId:
        RiverCrmRelationshipId;
    readonly channel:
        RiverCrmContactChannel;
    readonly status:
        RiverCrmConsentStatus;
    readonly consentTextVersion?:
        string;
    readonly consentSource:
        string;
    readonly capturedAt:
        string;
    readonly revokedAt?:
        string;
    readonly doNotContact:
        boolean;
    readonly createdAt:
        string;
    readonly updatedAt:
        string;
}

export interface CreateRiverCrmContactConsentInput {
    readonly consentId:
        unknown;
    readonly relationshipId:
        unknown;
    readonly channel:
        unknown;
    readonly status:
        unknown;
    readonly consentTextVersion?:
        unknown;
    readonly consentSource:
        unknown;
    readonly capturedAt:
        unknown;
    readonly revokedAt?:
        unknown;
    readonly doNotContact:
        unknown;
    readonly createdAt:
        unknown;
    readonly updatedAt:
        unknown;
}

export interface RiverCrmRelationshipEvent {
    readonly eventId:
        RiverCrmEventId;
    readonly relationshipId:
        RiverCrmRelationshipId;
    readonly eventType:
        RiverCrmRelationshipEventType;
    readonly occurredAt:
        string;
    readonly source:
        string;
    readonly externalReference?:
        string;
    readonly metadata?:
        RiverCrmJsonValue;
}

export interface CreateRiverCrmRelationshipEventInput {
    readonly eventId:
        unknown;
    readonly relationshipId:
        unknown;
    readonly eventType:
        unknown;
    readonly occurredAt:
        unknown;
    readonly source:
        unknown;
    readonly externalReference?:
        unknown;
    readonly metadata?:
        unknown;
}

function requiredText(
    value: unknown,
    field: string
): string {
    if(typeof value !== "string"){
        throw new TypeError(
            `River CRM requires ${field} to be text.`
        );
    }

    const normalized =
        value.trim();

    if(normalized.length === 0){
        throw new TypeError(
            `River CRM requires ${field}.`
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
            `River CRM requires ${field} to be text when provided.`
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
): RiverCrmRelationshipId {
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
            "River CRM requires a valid relationship identity."
        );
    }

    return normalized as
        RiverCrmRelationshipId;
}

function prefixedIdentifier(
    value: unknown,
    prefix: string,
    field: string
): string {
    const normalized =
        requiredText(
            value,
            field
        );

    if(
        !normalized.startsWith(prefix) ||
        normalized.length <=
            prefix.length
    ){
        throw new TypeError(
            `River CRM requires a valid ${field}.`
        );
    }

    return normalized;
}

function timestamp(
    value: unknown,
    field: string
): string {
    if(typeof value !== "string"){
        throw new TypeError(
            `River CRM requires ${field} to be a valid timestamp.`
        );
    }

    const normalized =
        value.trim();

    if(normalized.length === 0){
        throw new TypeError(
            `River CRM requires ${field} to be a valid timestamp.`
        );
    }

    const parsed =
        new Date(normalized);

    if(Number.isNaN(parsed.getTime())){
        throw new TypeError(
            `River CRM requires ${field} to be a valid timestamp.`
        );
    }

    return parsed.toISOString();
}

function optionalTimestamp(
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

    return timestamp(
        value,
        field
    );
}

function assertNotBefore(
    later: string,
    earlier: string,
    message: string
): void {
    if(
        new Date(later).getTime() <
        new Date(earlier).getTime()
    ){
        throw new TypeError(message);
    }
}

function oneOf<
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
            `River CRM ${field} is not supported.`
        );
    }

    return normalized as
        T[number];
}

function booleanValue(
    value: unknown,
    field: string
): boolean {
    if(typeof value !== "boolean"){
        throw new TypeError(
            `River CRM requires ${field} to be boolean.`
        );
    }

    return value;
}

function isPlainObject(
    value: unknown
): value is Record<string, unknown> {
    if(
        typeof value !== "object" ||
        value === null
    ){
        return false;
    }

    const prototype =
        Object.getPrototypeOf(value);

    return (
        prototype === Object.prototype ||
        prototype === null
    );
}

function assertJsonCompatible(
    value: unknown,
    seen:
        Set<object> = new Set()
): asserts value is RiverCrmJsonValue {
    if(
        value === null ||
        typeof value === "string" ||
        typeof value === "boolean"
    ){
        return;
    }

    if(typeof value === "number"){
        if(!Number.isFinite(value)){
            throw new TypeError(
                "River CRM event metadata must contain only JSON-compatible values."
            );
        }

        return;
    }

    if(typeof value !== "object"){
        throw new TypeError(
            "River CRM event metadata must contain only JSON-compatible values."
        );
    }

    if(seen.has(value)){
        throw new TypeError(
            "River CRM event metadata must not contain circular references."
        );
    }

    seen.add(value);

    if(Array.isArray(value)){
        for(const item of value){
            assertJsonCompatible(
                item,
                seen
            );
        }

        seen.delete(value);
        return;
    }

    if(!isPlainObject(value)){
        throw new TypeError(
            "River CRM event metadata must contain only JSON-compatible values."
        );
    }

    for(const item of Object.values(value)){
        assertJsonCompatible(
            item,
            seen
        );
    }

    seen.delete(value);
}

export function createRiverCrmAcquisitionAttribution(
    input:
        CreateRiverCrmAcquisitionAttributionInput
): RiverCrmAcquisitionAttribution {
    const capturedAt =
        timestamp(
            input.capturedAt,
            "capturedAt"
        );

    const updatedAt =
        timestamp(
            input.updatedAt,
            "updatedAt"
        );

    assertNotBefore(
        updatedAt,
        capturedAt,
        "River CRM requires updatedAt not to precede capturedAt."
    );

    const optional = {
        sourceVendor:
            optionalText(
                input.sourceVendor,
                "sourceVendor"
            ),
        campaign:
            optionalText(
                input.campaign,
                "campaign"
            ),
        adOrCreativeId:
            optionalText(
                input.adOrCreativeId,
                "adOrCreativeId"
            ),
        landingPage:
            optionalText(
                input.landingPage,
                "landingPage"
            ),
        utmSource:
            optionalText(
                input.utmSource,
                "utmSource"
            ),
        utmMedium:
            optionalText(
                input.utmMedium,
                "utmMedium"
            ),
        utmCampaign:
            optionalText(
                input.utmCampaign,
                "utmCampaign"
            ),
        utmTerm:
            optionalText(
                input.utmTerm,
                "utmTerm"
            ),
        utmContent:
            optionalText(
                input.utmContent,
                "utmContent"
            ),
        referralSource:
            optionalText(
                input.referralSource,
                "referralSource"
            )
    };

    return {
        relationshipId:
            canonicalRelationshipId(
                input.relationshipId
            ),
        source:
            requiredText(
                input.source,
                "source"
            ),
        ...(optional.sourceVendor !== undefined
            ? { sourceVendor: optional.sourceVendor }
            : {}),
        ...(optional.campaign !== undefined
            ? { campaign: optional.campaign }
            : {}),
        ...(optional.adOrCreativeId !== undefined
            ? { adOrCreativeId: optional.adOrCreativeId }
            : {}),
        ...(optional.landingPage !== undefined
            ? { landingPage: optional.landingPage }
            : {}),
        ...(optional.utmSource !== undefined
            ? { utmSource: optional.utmSource }
            : {}),
        ...(optional.utmMedium !== undefined
            ? { utmMedium: optional.utmMedium }
            : {}),
        ...(optional.utmCampaign !== undefined
            ? { utmCampaign: optional.utmCampaign }
            : {}),
        ...(optional.utmTerm !== undefined
            ? { utmTerm: optional.utmTerm }
            : {}),
        ...(optional.utmContent !== undefined
            ? { utmContent: optional.utmContent }
            : {}),
        ...(optional.referralSource !== undefined
            ? { referralSource: optional.referralSource }
            : {}),
        capturedAt,
        updatedAt
    };
}

export function createRiverCrmContactConsent(
    input:
        CreateRiverCrmContactConsentInput
): RiverCrmContactConsent {
    const status =
        oneOf(
            input.status,
            RIVER_CRM_CONSENT_STATUSES,
            "consent status"
        );

    const capturedAt =
        timestamp(
            input.capturedAt,
            "capturedAt"
        );

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

    const revokedAt =
        optionalTimestamp(
            input.revokedAt,
            "revokedAt"
        );

    assertNotBefore(
        updatedAt,
        createdAt,
        "River CRM requires updatedAt not to precede createdAt."
    );

    if(
        status === "revoked" &&
        revokedAt === undefined
    ){
        throw new TypeError(
            "River CRM revoked consent requires revokedAt."
        );
    }

    if(
        status !== "revoked" &&
        revokedAt !== undefined
    ){
        throw new TypeError(
            "River CRM non-revoked consent must not include revokedAt."
        );
    }

    if(revokedAt !== undefined){
        assertNotBefore(
            revokedAt,
            capturedAt,
            "River CRM requires revokedAt not to precede capturedAt."
        );
    }

    const consentTextVersion =
        optionalText(
            input.consentTextVersion,
            "consentTextVersion"
        );

    return {
        consentId:
            prefixedIdentifier(
                input.consentId,
                "consent:",
                "consent identity"
            ),
        relationshipId:
            canonicalRelationshipId(
                input.relationshipId
            ),
        channel:
            oneOf(
                input.channel,
                RIVER_CRM_CONTACT_CHANNELS,
                "contact channel"
            ),
        status,
        ...(consentTextVersion !== undefined
            ? { consentTextVersion }
            : {}),
        consentSource:
            requiredText(
                input.consentSource,
                "consentSource"
            ),
        capturedAt,
        ...(revokedAt !== undefined
            ? { revokedAt }
            : {}),
        doNotContact:
            booleanValue(
                input.doNotContact,
                "doNotContact"
            ),
        createdAt,
        updatedAt
    };
}

export function createRiverCrmRelationshipEvent(
    input:
        CreateRiverCrmRelationshipEventInput
): RiverCrmRelationshipEvent {
    const externalReference =
        optionalText(
            input.externalReference,
            "externalReference"
        );

    if(input.metadata !== undefined){
        assertJsonCompatible(
            input.metadata
        );
    }

    return {
        eventId:
            prefixedIdentifier(
                input.eventId,
                "crm-event:",
                "event identity"
            ),
        relationshipId:
            canonicalRelationshipId(
                input.relationshipId
            ),
        eventType:
            oneOf(
                input.eventType,
                RIVER_CRM_EVENT_TYPES,
                "event type"
            ),
        occurredAt:
            timestamp(
                input.occurredAt,
                "occurredAt"
            ),
        source:
            requiredText(
                input.source,
                "event source"
            ),
        ...(externalReference !== undefined
            ? { externalReference }
            : {}),
        ...(input.metadata !== undefined
            ? {
                metadata:
                    input.metadata as
                        RiverCrmJsonValue
            }
            : {})
    };
}
