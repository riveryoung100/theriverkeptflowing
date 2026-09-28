import {
    createRiverCrmAcquisitionAttribution,
    createRiverCrmContactConsent,
    createRiverCrmRelationshipEvent
} from "../river-os/crm-growth-contracts";

import type {
    RiverCrmAcquisitionAttribution,
    RiverCrmContactConsent,
    RiverCrmRelationshipEvent,
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";

import type {
    RiverCrmD1AllResult,
    RiverCrmD1Database
} from "../river-os/d1-crm-growth";

import {
    createInsuranceLeadProfile
} from "./lead-profile";

import type {
    InsuranceLeadProfile
} from "./lead-profile";

import {
    createInsuranceLeadPresentation,
    INSURANCE_PRESENTATION_EVENT_LIMIT
} from "./lead-presentation";

import type {
    InsuranceLeadPresentation
} from "./lead-presentation";


interface InsuranceProfileRow {
    readonly relationship_id:
        unknown;

    readonly state:
        unknown;

    readonly postal_code:
        unknown;

    readonly product_interest:
        unknown;

    readonly quote_status:
        unknown;

    readonly assigned_producer:
        unknown;

    readonly created_at:
        unknown;

    readonly updated_at:
        unknown;
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


export interface D1InsuranceLeadPresentationPersistence {
    listForRelationships(
        relationshipIds:
            readonly RiverCrmRelationshipId[]
    ): Promise<
        readonly InsuranceLeadPresentation[]
    >;
}


function requiredText(
    value:
        unknown,
    field:
        string
): string {
    if(
        typeof value !== "string" ||
        value.trim().length === 0
    ){
        throw new TypeError(
            `Insurance presentation D1 row requires ${field}.`
        );
    }

    return value.trim();
}

function nullableText(
    value:
        unknown,
    field:
        string
): string | undefined {
    if(value === null || value === undefined){
        return undefined;
    }

    if(typeof value !== "string"){
        throw new TypeError(
            `Insurance presentation D1 row requires ${field} to be text or null.`
        );
    }

    const normalized =
        value.trim();

    return normalized.length === 0
        ? undefined
        : normalized;
}

function booleanFromD1(
    value:
        unknown
): boolean {
    if(value === 0 || value === false){
        return false;
    }

    if(value === 1 || value === true){
        return true;
    }

    throw new TypeError(
        "Insurance presentation D1 row requires do_not_contact to be boolean storage."
    );
}

function metadataFromD1(
    value:
        unknown
): unknown {
    if(value === null || value === undefined){
        return undefined;
    }

    if(typeof value !== "string"){
        throw new TypeError(
            "Insurance presentation D1 event metadata must be text or null."
        );
    }

    try {
        return JSON.parse(
            value
        ) as unknown;
    }
    catch {
        throw new TypeError(
            "Insurance presentation D1 event metadata must contain valid JSON."
        );
    }
}

function profileFromRow(
    row:
        InsuranceProfileRow
): InsuranceLeadProfile {
    return createInsuranceLeadProfile({
        relationshipId:
            requiredText(
                row.relationship_id,
                "relationship_id"
            ),

        state:
            row.state,

        postalCode:
            row.postal_code,

        productInterest:
            row.product_interest,

        quoteStatus:
            row.quote_status,

        assignedProducer:
            nullableText(
                row.assigned_producer,
                "assigned_producer"
            ),

        createdAt:
            row.created_at,

        updatedAt:
            row.updated_at
    });
}

function acquisitionFromRow(
    row:
        AcquisitionRow
): RiverCrmAcquisitionAttribution {
    return createRiverCrmAcquisitionAttribution({
        relationshipId:
            requiredText(
                row.relationship_id,
                "relationship_id"
            ),

        source:
            row.source,

        sourceVendor:
            nullableText(
                row.source_vendor,
                "source_vendor"
            ),

        campaign:
            nullableText(
                row.campaign,
                "campaign"
            ),

        adOrCreativeId:
            nullableText(
                row.ad_or_creative_id,
                "ad_or_creative_id"
            ),

        landingPage:
            nullableText(
                row.landing_page,
                "landing_page"
            ),

        utmSource:
            nullableText(
                row.utm_source,
                "utm_source"
            ),

        utmMedium:
            nullableText(
                row.utm_medium,
                "utm_medium"
            ),

        utmCampaign:
            nullableText(
                row.utm_campaign,
                "utm_campaign"
            ),

        utmTerm:
            nullableText(
                row.utm_term,
                "utm_term"
            ),

        utmContent:
            nullableText(
                row.utm_content,
                "utm_content"
            ),

        referralSource:
            nullableText(
                row.referral_source,
                "referral_source"
            ),

        capturedAt:
            row.captured_at,

        updatedAt:
            row.updated_at
    });
}

function consentFromRow(
    row:
        ConsentRow
): RiverCrmContactConsent {
    return createRiverCrmContactConsent({
        consentId:
            requiredText(
                row.consent_id,
                "consent_id"
            ),

        relationshipId:
            requiredText(
                row.relationship_id,
                "relationship_id"
            ),

        channel:
            row.channel,

        status:
            row.status,

        consentTextVersion:
            nullableText(
                row.consent_text_version,
                "consent_text_version"
            ),

        consentSource:
            row.consent_source,

        capturedAt:
            row.captured_at,

        revokedAt:
            nullableText(
                row.revoked_at,
                "revoked_at"
            ),

        doNotContact:
            booleanFromD1(
                row.do_not_contact
            ),

        createdAt:
            row.created_at,

        updatedAt:
            row.updated_at
    });
}

function eventFromRow(
    row:
        EventRow
): RiverCrmRelationshipEvent {
    return createRiverCrmRelationshipEvent({
        eventId:
            requiredText(
                row.event_id,
                "event_id"
            ),

        relationshipId:
            requiredText(
                row.relationship_id,
                "relationship_id"
            ),

        eventType:
            row.event_type,

        occurredAt:
            row.occurred_at,

        source:
            row.source,

        externalReference:
            nullableText(
                row.external_reference,
                "external_reference"
            ),

        metadata:
            metadataFromD1(
                row.metadata_json
            )
    });
}

function canonicalRequestedIds(
    relationshipIds:
        readonly RiverCrmRelationshipId[]
): readonly RiverCrmRelationshipId[] {
    const result:
        RiverCrmRelationshipId[] = [];

    const seen =
        new Set<string>();

    for(const value of relationshipIds){
        if(
            typeof value !== "string" ||
            !value.startsWith(
                "relationship:"
            ) ||
            value.length <=
                "relationship:".length
        ){
            throw new TypeError(
                "Insurance presentation projection requires canonical relationship IDs."
            );
        }

        if(!seen.has(value)){
            seen.add(
                value
            );

            result.push(
                value
            );
        }
    }

    return result;
}

function placeholders(
    count:
        number
): string {
    return new Array(
        count
    )
        .fill("?")
        .join(", ");
}

function rowsFromResult<
    T
>(
    result:
        RiverCrmD1AllResult<T>,
    operation:
        string
): readonly T[] {
    if(result.success === false){
        throw new Error(
            `Insurance presentation D1 ${operation} failed.`
        );
    }

    return result.results ??
        [];
}

function pushGrouped<
    T extends {
        readonly relationshipId:
            RiverCrmRelationshipId;
    }
>(
    map:
        Map<
            RiverCrmRelationshipId,
            T[]
        >,
    value:
        T
): void {
    const existing =
        map.get(
            value.relationshipId
        );

    if(existing !== undefined){
        existing.push(
            value
        );

        return;
    }

    map.set(
        value.relationshipId,
        [
            value
        ]
    );
}


export function createD1InsuranceLeadPresentationPersistence(
    database:
        RiverCrmD1Database
): D1InsuranceLeadPresentationPersistence {
    return {
        async listForRelationships(
            relationshipIds
        ){
            const ids =
                canonicalRequestedIds(
                    relationshipIds
                );

            if(ids.length === 0){
                return [];
            }

            const parameterList =
                placeholders(
                    ids.length
                );

            const profileResult =
                await database
                    .prepare(`
                        SELECT
                            relationship_id,
                            state,
                            postal_code,
                            product_interest,
                            quote_status,
                            assigned_producer,
                            created_at,
                            updated_at
                        FROM river_crm_insurance_lead_profiles
                        WHERE relationship_id IN (${parameterList})
                        ORDER BY
                            relationship_id ASC
                    `)
                    .bind(
                        ...ids
                    )
                    .all<InsuranceProfileRow>();

            const profileRows =
                rowsFromResult(
                    profileResult,
                    "profile query"
                );

            if(profileRows.length === 0){
                return [];
            }

            const profiles =
                profileRows.map(
                    profileFromRow
                );

            const insuranceRelationshipIds =
                profiles.map(
                    profile =>
                        profile.relationshipId
                );

            const insuranceParameterList =
                placeholders(
                    insuranceRelationshipIds.length
                );

            const acquisitionResult =
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
                        WHERE relationship_id IN (${insuranceParameterList})
                        ORDER BY
                            relationship_id ASC
                    `)
                    .bind(
                        ...insuranceRelationshipIds
                    )
                    .all<AcquisitionRow>();

            const consentResult =
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
                        WHERE relationship_id IN (${insuranceParameterList})
                        ORDER BY
                            relationship_id ASC,
                            channel ASC,
                            updated_at DESC,
                            consent_id ASC
                    `)
                    .bind(
                        ...insuranceRelationshipIds
                    )
                    .all<ConsentRow>();

            const eventResult =
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
                        FROM (
                            SELECT
                                event_id,
                                relationship_id,
                                event_type,
                                occurred_at,
                                source,
                                external_reference,
                                metadata_json,
                                ROW_NUMBER() OVER (
                                    PARTITION BY relationship_id
                                    ORDER BY
                                        occurred_at DESC,
                                        event_id DESC
                                ) AS river_event_rank
                            FROM river_crm_relationship_events
                            WHERE relationship_id IN (${insuranceParameterList})
                        )
                        WHERE river_event_rank <= ${INSURANCE_PRESENTATION_EVENT_LIMIT}
                        ORDER BY
                            relationship_id ASC,
                            occurred_at DESC,
                            event_id DESC
                    `)
                    .bind(
                        ...insuranceRelationshipIds
                    )
                    .all<EventRow>();

            const acquisitions =
                new Map<
                    RiverCrmRelationshipId,
                    RiverCrmAcquisitionAttribution
                >();

            for(
                const row of rowsFromResult(
                    acquisitionResult,
                    "acquisition query"
                )
            ){
                const value =
                    acquisitionFromRow(
                        row
                    );

                acquisitions.set(
                    value.relationshipId,
                    value
                );
            }

            const consents =
                new Map<
                    RiverCrmRelationshipId,
                    RiverCrmContactConsent[]
                >();

            for(
                const row of rowsFromResult(
                    consentResult,
                    "consent query"
                )
            ){
                pushGrouped(
                    consents,
                    consentFromRow(
                        row
                    )
                );
            }

            const events =
                new Map<
                    RiverCrmRelationshipId,
                    RiverCrmRelationshipEvent[]
                >();

            for(
                const row of rowsFromResult(
                    eventResult,
                    "event query"
                )
            ){
                pushGrouped(
                    events,
                    eventFromRow(
                        row
                    )
                );
            }

            return profiles.map(
                profile =>
                    createInsuranceLeadPresentation({
                        profile,

                        acquisition:
                            acquisitions.get(
                                profile.relationshipId
                            ) ??
                            null,

                        consents:
                            consents.get(
                                profile.relationshipId
                            ) ??
                            [],

                        events:
                            events.get(
                                profile.relationshipId
                            ) ??
                            []
                    })
            );
        }
    };
}
