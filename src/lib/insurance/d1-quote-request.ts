import type {
    InsuranceQuoteRequestRecords
} from "./quote-request";


export interface InsuranceQuoteRequestD1RunResult {
    readonly success?:
        boolean;

    readonly meta?: {
        readonly changes?:
            number;
    };
}

export interface InsuranceQuoteRequestD1Statement {
    bind(
        ...values: unknown[]
    ): InsuranceQuoteRequestD1Statement;
}

export interface InsuranceQuoteRequestD1Database {
    prepare(
        sql: string
    ): InsuranceQuoteRequestD1Statement;

    batch(
        statements:
            readonly InsuranceQuoteRequestD1Statement[]
    ): Promise<
        readonly InsuranceQuoteRequestD1RunResult[]
    >;
}

export interface D1InsuranceQuoteRequestPersistence {
    createQuoteRequest(
        records:
            InsuranceQuoteRequestRecords
    ): Promise<void>;
}


function nullableText(
    value:
        string | undefined
): string | null {
    return value === undefined
        ? null
        : value;
}

function assertCanonicalRelationshipOwnership(
    records:
        InsuranceQuoteRequestRecords
): void {
    const relationshipId =
        records.relationship.relationshipId;

    if(
        records.acquisition.relationshipId !==
        relationshipId
    ){
        throw new TypeError(
            "Insurance quote request acquisition relationship does not match canonical relationship."
        );
    }

    if(
        records.insuranceProfile.relationshipId !==
        relationshipId
    ){
        throw new TypeError(
            "Insurance quote request profile relationship does not match canonical relationship."
        );
    }

    for(const consent of records.consents){
        if(
            consent.relationshipId !==
            relationshipId
        ){
            throw new TypeError(
                "Insurance quote request consent relationship does not match canonical relationship."
            );
        }
    }

    for(const event of records.events){
        if(
            event.relationshipId !==
            relationshipId
        ){
            throw new TypeError(
                "Insurance quote request event relationship does not match canonical relationship."
            );
        }
    }
}

function relationshipStatement(
    database:
        InsuranceQuoteRequestD1Database,
    records:
        InsuranceQuoteRequestRecords
): InsuranceQuoteRequestD1Statement {
    const value =
        records.relationship;

    return database
        .prepare(`
            INSERT INTO river_crm_relationships (
                relationship_id,
                display_name,
                kind,
                stage,
                source,
                email,
                phone,
                owner,
                next_follow_up_at,
                appointment_at,
                created_at,
                updated_at
            )
            VALUES (
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?
            )
        `)
        .bind(
            value.relationshipId,
            value.displayName,
            value.kind,
            value.stage,
            value.source,
            nullableText(
                value.email
            ),
            nullableText(
                value.phone
            ),
            nullableText(
                value.owner
            ),
            nullableText(
                value.nextFollowUpAt
            ),
            nullableText(
                value.appointmentAt
            ),
            value.createdAt,
            value.updatedAt
        );
}

function acquisitionStatement(
    database:
        InsuranceQuoteRequestD1Database,
    records:
        InsuranceQuoteRequestRecords
): InsuranceQuoteRequestD1Statement {
    const value =
        records.acquisition;

    return database
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
        );
}

function insuranceProfileStatement(
    database:
        InsuranceQuoteRequestD1Database,
    records:
        InsuranceQuoteRequestRecords
): InsuranceQuoteRequestD1Statement {
    const value =
        records.insuranceProfile;

    return database
        .prepare(`
            INSERT INTO river_crm_insurance_lead_profiles (
                relationship_id,
                state,
                postal_code,
                product_interest,
                quote_status,
                assigned_producer,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
            value.relationshipId,
            value.state,
            value.postalCode,
            value.productInterest,
            value.quoteStatus,
            nullableText(
                value.assignedProducer
            ),
            value.createdAt,
            value.updatedAt
        );
}

function consentStatement(
    database:
        InsuranceQuoteRequestD1Database,
    consent:
        InsuranceQuoteRequestRecords["consents"][number]
): InsuranceQuoteRequestD1Statement {
    return database
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
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
            consent.consentId,
            consent.relationshipId,
            consent.channel,
            consent.status,
            nullableText(
                consent.consentTextVersion
            ),
            consent.consentSource,
            consent.capturedAt,
            nullableText(
                consent.revokedAt
            ),
            consent.doNotContact
                ? 1
                : 0,
            consent.createdAt,
            consent.updatedAt
        );
}

function eventStatement(
    database:
        InsuranceQuoteRequestD1Database,
    event:
        InsuranceQuoteRequestRecords["events"][number]
): InsuranceQuoteRequestD1Statement {
    return database
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
            event.eventId,
            event.relationshipId,
            event.eventType,
            event.occurredAt,
            event.source,
            nullableText(
                event.externalReference
            ),
            event.metadata === undefined
                ? null
                : JSON.stringify(
                    event.metadata
                )
        );
}

function assertBatchSucceeded(
    results:
        readonly InsuranceQuoteRequestD1RunResult[],
    expectedCount:
        number
): void {
    if(results.length !== expectedCount){
        throw new Error(
            "Insurance quote request D1 batch returned an unexpected result count."
        );
    }

    for(const result of results){
        if(result.success === false){
            throw new Error(
                "Insurance quote request D1 batch failed."
            );
        }
    }
}

export function createD1InsuranceQuoteRequestPersistence(
    database:
        InsuranceQuoteRequestD1Database
): D1InsuranceQuoteRequestPersistence {
    return {
        async createQuoteRequest(
            records
        ){
            assertCanonicalRelationshipOwnership(
                records
            );

            const statements:
                InsuranceQuoteRequestD1Statement[] = [
                    relationshipStatement(
                        database,
                        records
                    ),
                    acquisitionStatement(
                        database,
                        records
                    ),
                    insuranceProfileStatement(
                        database,
                        records
                    )
                ];

            for(const consent of records.consents){
                statements.push(
                    consentStatement(
                        database,
                        consent
                    )
                );
            }

            for(const event of records.events){
                statements.push(
                    eventStatement(
                        database,
                        event
                    )
                );
            }

            const results =
                await database.batch(
                    statements
                );

            assertBatchSucceeded(
                results,
                statements.length
            );
        }
    };
}
