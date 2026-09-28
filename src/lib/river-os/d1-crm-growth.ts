import {
    createRiverCrmAcquisitionAttribution,
    createRiverCrmContactConsent,
    createRiverCrmRelationshipEvent
} from "./crm-growth-contracts";

import type {
    CreateRiverCrmAcquisitionAttributionInput,
    CreateRiverCrmContactConsentInput,
    CreateRiverCrmRelationshipEventInput,
    RiverCrmAcquisitionAttribution,
    RiverCrmContactConsent,
    RiverCrmRelationshipEvent,
    RiverCrmRelationshipId
} from "./crm-growth-contracts";


export interface RiverCrmD1RunResult {
    readonly success?:
        boolean;
    readonly meta?: {
        readonly changes?:
            number;
    };
}

export interface RiverCrmD1AllResult<
    T
> {
    readonly results?:
        readonly T[];
    readonly success?:
        boolean;
}

export interface RiverCrmD1Statement {
    bind(
        ...values: unknown[]
    ): RiverCrmD1Statement;

    first<
        T = Record<string, unknown>
    >(): Promise<T | null>;

    all<
        T = Record<string, unknown>
    >(): Promise<
        RiverCrmD1AllResult<T>
    >;

    run(): Promise<
        RiverCrmD1RunResult
    >;
}

export interface RiverCrmD1Database {
    prepare(
        sql: string
    ): RiverCrmD1Statement;
}

interface AcquisitionRow {
    readonly relationship_id:
        unknown;
    readonly source:
        unknown;
    readonly source_vendor:
        unknown;
    readonly campaign:
        unknown;
    readonly ad_or_creative_id:
        unknown;
    readonly landing_page:
        unknown;
    readonly utm_source:
        unknown;
    readonly utm_medium:
        unknown;
    readonly utm_campaign:
        unknown;
    readonly utm_term:
        unknown;
    readonly utm_content:
        unknown;
    readonly referral_source:
        unknown;
    readonly captured_at:
        unknown;
    readonly updated_at:
        unknown;
}

interface ConsentRow {
    readonly consent_id:
        unknown;
    readonly relationship_id:
        unknown;
    readonly channel:
        unknown;
    readonly status:
        unknown;
    readonly consent_text_version:
        unknown;
    readonly consent_source:
        unknown;
    readonly captured_at:
        unknown;
    readonly revoked_at:
        unknown;
    readonly do_not_contact:
        unknown;
    readonly created_at:
        unknown;
    readonly updated_at:
        unknown;
}

interface EventRow {
    readonly event_id:
        unknown;
    readonly relationship_id:
        unknown;
    readonly event_type:
        unknown;
    readonly occurred_at:
        unknown;
    readonly source:
        unknown;
    readonly external_reference:
        unknown;
    readonly metadata_json:
        unknown;
}

function nullableText(
    value: string | undefined
): string | null {
    return value === undefined
        ? null
        : value;
}

function booleanFromSql(
    value: unknown
): boolean {
    if(value === 0){
        return false;
    }

    if(value === 1){
        return true;
    }

    throw new TypeError(
        "River CRM persisted do_not_contact must be 0 or 1."
    );
}

function parseMetadata(
    value: unknown
): unknown {
    if(
        value === null ||
        value === undefined
    ){
        return undefined;
    }

    if(typeof value !== "string"){
        throw new TypeError(
            "River CRM persisted event metadata must be text or null."
        );
    }

    return JSON.parse(value);
}

function acquisitionFromRow(
    row: AcquisitionRow
): RiverCrmAcquisitionAttribution {
    return createRiverCrmAcquisitionAttribution({
        relationshipId:
            row.relationship_id,
        source:
            row.source,
        sourceVendor:
            row.source_vendor,
        campaign:
            row.campaign,
        adOrCreativeId:
            row.ad_or_creative_id,
        landingPage:
            row.landing_page,
        utmSource:
            row.utm_source,
        utmMedium:
            row.utm_medium,
        utmCampaign:
            row.utm_campaign,
        utmTerm:
            row.utm_term,
        utmContent:
            row.utm_content,
        referralSource:
            row.referral_source,
        capturedAt:
            row.captured_at,
        updatedAt:
            row.updated_at
    });
}

function consentFromRow(
    row: ConsentRow
): RiverCrmContactConsent {
    return createRiverCrmContactConsent({
        consentId:
            row.consent_id,
        relationshipId:
            row.relationship_id,
        channel:
            row.channel,
        status:
            row.status,
        consentTextVersion:
            row.consent_text_version,
        consentSource:
            row.consent_source,
        capturedAt:
            row.captured_at,
        revokedAt:
            row.revoked_at,
        doNotContact:
            booleanFromSql(
                row.do_not_contact
            ),
        createdAt:
            row.created_at,
        updatedAt:
            row.updated_at
    });
}

function eventFromRow(
    row: EventRow
): RiverCrmRelationshipEvent {
    return createRiverCrmRelationshipEvent({
        eventId:
            row.event_id,
        relationshipId:
            row.relationship_id,
        eventType:
            row.event_type,
        occurredAt:
            row.occurred_at,
        source:
            row.source,
        externalReference:
            row.external_reference,
        metadata:
            parseMetadata(
                row.metadata_json
            )
    });
}

function assertRunSucceeded(
    result: RiverCrmD1RunResult,
    operation: string
): void {
    if(result.success === false){
        throw new Error(
            `River CRM D1 ${operation} failed.`
        );
    }
}

export interface D1RiverCrmGrowthPersistence {
    getAcquisitionAttribution(
        relationshipId:
            RiverCrmRelationshipId
    ): Promise<
        RiverCrmAcquisitionAttribution |
        null
    >;

    upsertAcquisitionAttribution(
        input:
            CreateRiverCrmAcquisitionAttributionInput
    ): Promise<
        RiverCrmAcquisitionAttribution
    >;

    listContactConsents(
        relationshipId:
            RiverCrmRelationshipId
    ): Promise<
        readonly RiverCrmContactConsent[]
    >;

    saveContactConsent(
        input:
            CreateRiverCrmContactConsentInput
    ): Promise<
        RiverCrmContactConsent
    >;

    appendRelationshipEvent(
        input:
            CreateRiverCrmRelationshipEventInput
    ): Promise<
        RiverCrmRelationshipEvent
    >;

    listRelationshipEvents(
        relationshipId:
            RiverCrmRelationshipId
    ): Promise<
        readonly RiverCrmRelationshipEvent[]
    >;
}

export function createD1RiverCrmGrowthPersistence(
    database:
        RiverCrmD1Database
): D1RiverCrmGrowthPersistence {
    return {
        async getAcquisitionAttribution(
            relationshipId
        ){
            const row =
                await database
                    .prepare(`
                        SELECT
                            relationship_id,
                            source,
                            source_vendor,
                            campaign,
                            ad_or_creative_id,
                            landing_page,
                            utm_source,
                            utm_medium,
                            utm_campaign,
                            utm_term,
                            utm_content,
                            referral_source,
                            captured_at,
                            updated_at
                        FROM river_crm_acquisition_attribution
                        WHERE relationship_id = ?
                        LIMIT 1
                    `)
                    .bind(
                        relationshipId
                    )
                    .first<AcquisitionRow>();

            return row === null
                ? null
                : acquisitionFromRow(row);
        },

        async upsertAcquisitionAttribution(
            input
        ){
            const value =
                createRiverCrmAcquisitionAttribution(
                    input
                );

            const result =
                await database
                    .prepare(`
                        INSERT INTO river_crm_acquisition_attribution (
                            relationship_id,
                            source,
                            source_vendor,
                            campaign,
                            ad_or_creative_id,
                            landing_page,
                            utm_source,
                            utm_medium,
                            utm_campaign,
                            utm_term,
                            utm_content,
                            referral_source,
                            captured_at,
                            updated_at
                        )
                        VALUES (
                            ?, ?, ?, ?, ?, ?, ?,
                            ?, ?, ?, ?, ?, ?, ?
                        )
                        ON CONFLICT (relationship_id)
                        DO UPDATE SET
                            source = excluded.source,
                            source_vendor = excluded.source_vendor,
                            campaign = excluded.campaign,
                            ad_or_creative_id = excluded.ad_or_creative_id,
                            landing_page = excluded.landing_page,
                            utm_source = excluded.utm_source,
                            utm_medium = excluded.utm_medium,
                            utm_campaign = excluded.utm_campaign,
                            utm_term = excluded.utm_term,
                            utm_content = excluded.utm_content,
                            referral_source = excluded.referral_source,
                            captured_at = excluded.captured_at,
                            updated_at = excluded.updated_at
                    `)
                    .bind(
                        value.relationshipId,
                        value.source,
                        nullableText(
                            value.sourceVendor
                        ),
                        nullableText(
                            value.campaign
                        ),
                        nullableText(
                            value.adOrCreativeId
                        ),
                        nullableText(
                            value.landingPage
                        ),
                        nullableText(
                            value.utmSource
                        ),
                        nullableText(
                            value.utmMedium
                        ),
                        nullableText(
                            value.utmCampaign
                        ),
                        nullableText(
                            value.utmTerm
                        ),
                        nullableText(
                            value.utmContent
                        ),
                        nullableText(
                            value.referralSource
                        ),
                        value.capturedAt,
                        value.updatedAt
                    )
                    .run();

            assertRunSucceeded(
                result,
                "acquisition upsert"
            );

            return value;
        },

        async listContactConsents(
            relationshipId
        ){
            const result =
                await database
                    .prepare(`
                        SELECT
                            consent_id,
                            relationship_id,
                            channel,
                            status,
                            consent_text_version,
                            consent_source,
                            captured_at,
                            revoked_at,
                            do_not_contact,
                            created_at,
                            updated_at
                        FROM river_crm_contact_consents
                        WHERE relationship_id = ?
                        ORDER BY
                            updated_at DESC,
                            consent_id ASC
                    `)
                    .bind(
                        relationshipId
                    )
                    .all<ConsentRow>();

            if(result.success === false){
                throw new Error(
                    "River CRM D1 consent list failed."
                );
            }

            return (
                result.results ??
                []
            ).map(consentFromRow);
        },

        async saveContactConsent(
            input
        ){
            const value =
                createRiverCrmContactConsent(
                    input
                );

            const result =
                await database
                    .prepare(`
                        INSERT INTO river_crm_contact_consents (
                            consent_id,
                            relationship_id,
                            channel,
                            status,
                            consent_text_version,
                            consent_source,
                            captured_at,
                            revoked_at,
                            do_not_contact,
                            created_at,
                            updated_at
                        )
                        VALUES (
                            ?, ?, ?, ?, ?, ?, ?,
                            ?, ?, ?, ?
                        )
                        ON CONFLICT (consent_id)
                        DO UPDATE SET
                            relationship_id = excluded.relationship_id,
                            channel = excluded.channel,
                            status = excluded.status,
                            consent_text_version = excluded.consent_text_version,
                            consent_source = excluded.consent_source,
                            captured_at = excluded.captured_at,
                            revoked_at = excluded.revoked_at,
                            do_not_contact = excluded.do_not_contact,
                            updated_at = excluded.updated_at
                    `)
                    .bind(
                        value.consentId,
                        value.relationshipId,
                        value.channel,
                        value.status,
                        nullableText(
                            value.consentTextVersion
                        ),
                        value.consentSource,
                        value.capturedAt,
                        nullableText(
                            value.revokedAt
                        ),
                        value.doNotContact
                            ? 1
                            : 0,
                        value.createdAt,
                        value.updatedAt
                    )
                    .run();

            assertRunSucceeded(
                result,
                "consent save"
            );

            return value;
        },

        async appendRelationshipEvent(
            input
        ){
            const value =
                createRiverCrmRelationshipEvent(
                    input
                );

            const metadataJson =
                value.metadata === undefined
                    ? null
                    : JSON.stringify(
                        value.metadata
                    );

            const result =
                await database
                    .prepare(`
                        INSERT INTO river_crm_relationship_events (
                            event_id,
                            relationship_id,
                            event_type,
                            occurred_at,
                            source,
                            external_reference,
                            metadata_json
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `)
                    .bind(
                        value.eventId,
                        value.relationshipId,
                        value.eventType,
                        value.occurredAt,
                        value.source,
                        nullableText(
                            value.externalReference
                        ),
                        metadataJson
                    )
                    .run();

            assertRunSucceeded(
                result,
                "relationship event append"
            );

            return value;
        },

        async listRelationshipEvents(
            relationshipId
        ){
            const result =
                await database
                    .prepare(`
                        SELECT
                            event_id,
                            relationship_id,
                            event_type,
                            occurred_at,
                            source,
                            external_reference,
                            metadata_json
                        FROM river_crm_relationship_events
                        WHERE relationship_id = ?
                        ORDER BY
                            occurred_at ASC,
                            event_id ASC
                    `)
                    .bind(
                        relationshipId
                    )
                    .all<EventRow>();

            if(result.success === false){
                throw new Error(
                    "River CRM D1 event list failed."
                );
            }

            return (
                result.results ??
                []
            ).map(eventFromRow);
        }
    };
}
