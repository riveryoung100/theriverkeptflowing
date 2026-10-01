import type {
    InsuranceQuoteRequestRecords
} from "./quote-request";

import {
    createInsuranceQuoteRequestIdempotencyKey,
    requireInsuranceQuoteRequestFingerprint
} from "./quote-request-idempotency";

import type {
    InsuranceQuoteRequestFingerprint,
    InsuranceQuoteRequestIdempotencyKey
} from "./quote-request-idempotency";


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

    first<T>():
        Promise<
            T |
            null
        >;
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

export interface InsuranceQuoteRequestIdempotentCreateInput {
    readonly idempotencyKey:
        InsuranceQuoteRequestIdempotencyKey;

    readonly requestFingerprint:
        InsuranceQuoteRequestFingerprint;

    readonly records:
        InsuranceQuoteRequestRecords;
}


export type InsuranceQuoteRequestIdempotentCreateResult =
    | {
        readonly outcome:
            "created";

        readonly relationshipId:
            string;
    }
    | {
        readonly outcome:
            "replayed";

        readonly relationshipId:
            string;
    };


export class InsuranceQuoteRequestIdempotencyConflictError
extends Error {
    public readonly idempotencyKey:
        InsuranceQuoteRequestIdempotencyKey;

    public constructor(
        idempotencyKey:
            InsuranceQuoteRequestIdempotencyKey
    ){
        super(
            "Insurance quote request idempotency key was already used for different request content."
        );

        this.name =
            "InsuranceQuoteRequestIdempotencyConflictError";

        this.idempotencyKey =
            idempotencyKey;
    }
}


export interface D1InsuranceQuoteRequestPersistence {
    createQuoteRequest(
        records:
            InsuranceQuoteRequestRecords
    ): Promise<void>;

    createIdempotentQuoteRequest(
        input:
            InsuranceQuoteRequestIdempotentCreateInput
    ): Promise<
        InsuranceQuoteRequestIdempotentCreateResult
    >;
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


interface InsuranceQuoteRequestSubmissionRow {
    readonly idempotency_key:
        string;

    readonly request_fingerprint:
        string;

    readonly relationship_id:
        string;

    readonly created_at:
        string;
}


interface InsuranceQuoteRequestSubmission {
    readonly idempotencyKey:
        InsuranceQuoteRequestIdempotencyKey;

    readonly requestFingerprint:
        InsuranceQuoteRequestFingerprint;

    readonly relationshipId:
        string;
}


function requireStoredRelationshipId(
    value:
        unknown
): string {
    if(
        typeof value !==
            "string" ||
        value.length === 0 ||
        value.trim() !==
            value
    ){
        throw new TypeError(
            "Insurance quote request submission relationship ID is invalid."
        );
    }

    return value;
}


function buildQuoteRequestStatements(
    database:
        InsuranceQuoteRequestD1Database,
    records:
        InsuranceQuoteRequestRecords
):
    InsuranceQuoteRequestD1Statement[] {

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

    return statements;
}


function submissionStatement(
    database:
        InsuranceQuoteRequestD1Database,
    input:
        InsuranceQuoteRequestIdempotentCreateInput
): InsuranceQuoteRequestD1Statement {
    return database
        .prepare(`
            INSERT INTO river_crm_insurance_quote_request_submissions (
                idempotency_key,
                request_fingerprint,
                relationship_id,
                created_at
            )
            VALUES (?, ?, ?, ?)
        `)
        .bind(
            input.idempotencyKey,
            input.requestFingerprint,
            input.records
                .relationship
                .relationshipId,
            input.records
                .relationship
                .createdAt
        );
}


async function loadSubmission(
    database:
        InsuranceQuoteRequestD1Database,
    idempotencyKey:
        InsuranceQuoteRequestIdempotencyKey
):
    Promise<
        InsuranceQuoteRequestSubmission |
        undefined
    > {

    const row =
        await database
            .prepare(`
                SELECT
                    idempotency_key,
                    request_fingerprint,
                    relationship_id,
                    created_at
                FROM river_crm_insurance_quote_request_submissions
                WHERE idempotency_key = ?1
                LIMIT 1
            `)
            .bind(
                idempotencyKey
            )
            .first<
                InsuranceQuoteRequestSubmissionRow
            >();

    if(row === null){
        return undefined;
    }

    return {
        idempotencyKey:
            createInsuranceQuoteRequestIdempotencyKey(
                row.idempotency_key
            ),

        requestFingerprint:
            requireInsuranceQuoteRequestFingerprint(
                row.request_fingerprint
            ),

        relationshipId:
            requireStoredRelationshipId(
                row.relationship_id
            )
    };
}


function resolveExistingSubmission(
    existing:
        InsuranceQuoteRequestSubmission,
    idempotencyKey:
        InsuranceQuoteRequestIdempotencyKey,
    requestFingerprint:
        InsuranceQuoteRequestFingerprint
):
    InsuranceQuoteRequestIdempotentCreateResult {

    if(
        existing.requestFingerprint !==
        requestFingerprint
    ){
        throw new InsuranceQuoteRequestIdempotencyConflictError(
            idempotencyKey
        );
    }

    return {
        outcome:
            "replayed",

        relationshipId:
            existing.relationshipId
    };
}


function buildIdempotentQuoteRequestStatements(
    database:
        InsuranceQuoteRequestD1Database,
    input:
        InsuranceQuoteRequestIdempotentCreateInput
):
    InsuranceQuoteRequestD1Statement[] {

    const quoteStatements =
        buildQuoteRequestStatements(
            database,
            input.records
        );

    const relationship =
        quoteStatements[0];

    if(relationship === undefined){
        throw new Error(
            "Insurance quote request statement construction produced no relationship statement."
        );
    }

    return [
        relationship,
        submissionStatement(
            database,
            input
        ),
        ...quoteStatements.slice(
            1
        )
    ];
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

            const statements =
                buildQuoteRequestStatements(
                    database,
                    records
                );

            const results =
                await database.batch(
                    statements
                );

            assertBatchSucceeded(
                results,
                statements.length
            );
        },

        async createIdempotentQuoteRequest(
            input
        ){
            assertCanonicalRelationshipOwnership(
                input.records
            );

            const idempotencyKey =
                createInsuranceQuoteRequestIdempotencyKey(
                    input.idempotencyKey
                );

            const requestFingerprint =
                requireInsuranceQuoteRequestFingerprint(
                    input.requestFingerprint
                );

            const canonicalInput = {
                idempotencyKey,
                requestFingerprint,
                records:
                    input.records
            } satisfies
                InsuranceQuoteRequestIdempotentCreateInput;

            const existing =
                await loadSubmission(
                    database,
                    idempotencyKey
                );

            if(existing !== undefined){
                return resolveExistingSubmission(
                    existing,
                    idempotencyKey,
                    requestFingerprint
                );
            }

            const statements =
                buildIdempotentQuoteRequestStatements(
                    database,
                    canonicalInput
                );

            try {
                const results =
                    await database.batch(
                        statements
                    );

                assertBatchSucceeded(
                    results,
                    statements.length
                );

                return {
                    outcome:
                        "created",

                    relationshipId:
                        input.records
                            .relationship
                            .relationshipId
                };
            }
            catch(error){
                const raced =
                    await loadSubmission(
                        database,
                        idempotencyKey
                    );

                if(raced === undefined){
                    throw error;
                }

                return resolveExistingSubmission(
                    raced,
                    idempotencyKey,
                    requestFingerprint
                );
            }
        }
    };
}