import type {
    RiverCrmD1Database,
    RiverCrmD1RunResult
} from "../river-os/d1-crm-growth";

import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";

import {
    createInsuranceContactAttempt,
    createInsuranceContactAttemptId
} from "./contact-attempt";

import type {
    InsuranceContactAttempt,
    InsuranceContactAttemptId
} from "./contact-attempt";


interface InsuranceContactAttemptRow {
    readonly attempt_id:
        unknown;

    readonly relationship_id:
        unknown;

    readonly trigger_event_id:
        unknown;

    readonly channel:
        unknown;

    readonly intent:
        unknown;

    readonly state:
        unknown;

    readonly idempotency_key:
        unknown;

    readonly provider:
        unknown;

    readonly provider_reference:
        unknown;

    readonly requested_at:
        unknown;

    readonly attempted_at:
        unknown;

    readonly connected_at:
        unknown;

    readonly completed_at:
        unknown;

    readonly failed_at:
        unknown;

    readonly canceled_at:
        unknown;

    readonly failure_code:
        unknown;

    readonly failure_message:
        unknown;

    readonly retryable:
        unknown;

    readonly created_at:
        unknown;

    readonly updated_at:
        unknown;
}


export interface InsuranceContactProviderEventReceipt {
    readonly provider:
        string;

    readonly providerEventId:
        string;

    readonly attemptId?:
        InsuranceContactAttemptId;

    readonly receivedAt:
        string;
}


export interface InsuranceContactAttemptPersistence {
    insertAttempt(
        attempt:
            InsuranceContactAttempt
    ):
        Promise<void>;

    updateAttempt(
        attempt:
            InsuranceContactAttempt
    ):
        Promise<void>;

    getAttempt(
        attemptId:
            InsuranceContactAttemptId | string
    ):
        Promise<
            InsuranceContactAttempt |
            undefined
        >;

    getAttemptByIdempotencyKey(
        idempotencyKey:
            string
    ):
        Promise<
            InsuranceContactAttempt |
            undefined
        >;

    getAttemptByProviderReference(
        provider:
            string,
        providerReference:
            string
    ):
        Promise<
            InsuranceContactAttempt |
            undefined
        >;

    listAttemptsForRelationship(
        relationshipId:
            RiverCrmRelationshipId | string,
        limit?:
            number
    ):
        Promise<
            readonly InsuranceContactAttempt[]
        >;

    listAttemptsForRelationships(
        relationshipIds:
            readonly (
                RiverCrmRelationshipId |
                string
            )[],
        limitPerRelationship?:
            number
    ):
        Promise<
            readonly InsuranceContactAttempt[]
        >;

    recordProviderEventReceipt(
        receipt:
            InsuranceContactProviderEventReceipt
    ):
        Promise<boolean>;
}


function requiredText(
    value:
        unknown,
    field:
        string
):
    string {

    if(
        typeof value !==
            "string" ||
        value.trim().length ===
            0
    ){
        throw new TypeError(
            `Insurance contact-attempt persistence requires ${field} to be non-empty text.`
        );
    }

    return value.trim();
}


function nullableText(
    value:
        unknown,
    field:
        string
):
    string | undefined {

    if(
        value === null ||
        value === undefined
    ){
        return undefined;
    }

    return requiredText(
        value,
        field
    );
}


function requireRelationshipId(
    value:
        unknown
):
    RiverCrmRelationshipId {

    const relationshipId =
        requiredText(
            value,
            "relationship_id"
        );

    if(
        !relationshipId.startsWith(
            "relationship:"
        ) ||
        relationshipId.length <=
            "relationship:".length
    ){
        throw new TypeError(
            "Insurance contact-attempt persistence requires a canonical River CRM relationship identity."
        );
    }

    return relationshipId as
        RiverCrmRelationshipId;
}


function requireTimestamp(
    value:
        unknown,
    field:
        string
):
    string {

    const text =
        requiredText(
            value,
            field
        );

    if(
        Number.isNaN(
            Date.parse(
                text
            )
        )
    ){
        throw new TypeError(
            `Insurance contact-attempt persistence requires ${field} to be a valid timestamp.`
        );
    }

    return text;
}


function nullableTimestamp(
    value:
        unknown,
    field:
        string
):
    string | undefined {

    if(
        value === null ||
        value === undefined
    ){
        return undefined;
    }

    return requireTimestamp(
        value,
        field
    );
}


function nullableBoolean(
    value:
        unknown
):
    boolean | undefined {

    if(
        value === null ||
        value === undefined
    ){
        return undefined;
    }

    if(
        value === 0 ||
        value === false
    ){
        return false;
    }

    if(
        value === 1 ||
        value === true
    ){
        return true;
    }

    throw new TypeError(
        "Insurance contact-attempt persisted retryable must be null, 0, or 1."
    );
}


function rowToAttempt(
    row:
        InsuranceContactAttemptRow
):
    InsuranceContactAttempt {

    return createInsuranceContactAttempt({
        attemptId:
            requiredText(
                row.attempt_id,
                "attempt_id"
            ),

        relationshipId:
            requireRelationshipId(
                row.relationship_id
            ),

        channel:
            requiredText(
                row.channel,
                "channel"
            ),

        intent:
            requiredText(
                row.intent,
                "intent"
            ),

        state:
            requiredText(
                row.state,
                "state"
            ),

        idempotencyKey:
            requiredText(
                row.idempotency_key,
                "idempotency_key"
            ),

        requestedAt:
            requireTimestamp(
                row.requested_at,
                "requested_at"
            ),

        createdAt:
            requireTimestamp(
                row.created_at,
                "created_at"
            ),

        updatedAt:
            requireTimestamp(
                row.updated_at,
                "updated_at"
            ),

        triggerEventId:
            nullableText(
                row.trigger_event_id,
                "trigger_event_id"
            ),

        provider:
            nullableText(
                row.provider,
                "provider"
            ),

        providerReference:
            nullableText(
                row.provider_reference,
                "provider_reference"
            ),

        attemptedAt:
            nullableTimestamp(
                row.attempted_at,
                "attempted_at"
            ),

        connectedAt:
            nullableTimestamp(
                row.connected_at,
                "connected_at"
            ),

        completedAt:
            nullableTimestamp(
                row.completed_at,
                "completed_at"
            ),

        failedAt:
            nullableTimestamp(
                row.failed_at,
                "failed_at"
            ),

        canceledAt:
            nullableTimestamp(
                row.canceled_at,
                "canceled_at"
            ),

        failureCode:
            nullableText(
                row.failure_code,
                "failure_code"
            ),

        failureMessage:
            nullableText(
                row.failure_message,
                "failure_message"
            ),

        retryable:
            nullableBoolean(
                row.retryable
            )
    });
}


function assertRunSucceeded(
    result:
        RiverCrmD1RunResult,
    operation:
        string
):
    void {

    if(result.success === false){
        throw new Error(
            `Insurance contact-attempt D1 ${operation} failed.`
        );
    }
}


function requireExactlyOneChange(
    result:
        RiverCrmD1RunResult,
    operation:
        string
):
    void {

    assertRunSucceeded(
        result,
        operation
    );

    if(
        result.meta?.changes !==
            1
    ){
        throw new Error(
            `Insurance contact-attempt D1 ${operation} expected exactly one changed row.`
        );
    }
}


function requireLimit(
    value:
        number
):
    number {

    if(
        !Number.isInteger(
            value
        ) ||
        value < 1 ||
        value > 100
    ){
        throw new TypeError(
            "Insurance contact-attempt list limit must be an integer from 1 through 100."
        );
    }

    return value;
}


function booleanStorage(
    value:
        boolean | undefined
):
    number | null {

    if(value === undefined){
        return null;
    }

    return value
        ? 1
        : 0;
}


function validateProviderEventReceipt(
    input:
        InsuranceContactProviderEventReceipt
):
    InsuranceContactProviderEventReceipt {

    return {
        provider:
            requiredText(
                input.provider,
                "provider"
            ),

        providerEventId:
            requiredText(
                input.providerEventId,
                "provider_event_id"
            ),

        ...(input.attemptId !==
            undefined
            ? {
                attemptId:
                    createInsuranceContactAttemptId(
                        input.attemptId
                    )
            }
            : {}),

        receivedAt:
            requireTimestamp(
                input.receivedAt,
                "received_at"
            )
    };
}


class D1InsuranceContactAttemptPersistence
implements InsuranceContactAttemptPersistence {

    public constructor(
        private readonly database:
            RiverCrmD1Database
    ) {}


    public async insertAttempt(
        attempt:
            InsuranceContactAttempt
    ):
        Promise<void> {

        const canonical =
            createInsuranceContactAttempt(
                attempt
            );

        const result =
            await this.database
                .prepare(
                    `
                        INSERT INTO river_crm_contact_attempts (
                            attempt_id,
                            relationship_id,
                            trigger_event_id,
                            channel,
                            intent,
                            state,
                            idempotency_key,
                            provider,
                            provider_reference,
                            requested_at,
                            attempted_at,
                            connected_at,
                            completed_at,
                            failed_at,
                            canceled_at,
                            failure_code,
                            failure_message,
                            retryable,
                            created_at,
                            updated_at
                        )
                        VALUES (
                            ?1, ?2, ?3, ?4, ?5,
                            ?6, ?7, ?8, ?9, ?10,
                            ?11, ?12, ?13, ?14, ?15,
                            ?16, ?17, ?18, ?19, ?20
                        )
                    `
                )
                .bind(
                    canonical.attemptId,
                    canonical.relationshipId,
                    canonical.triggerEventId ?? null,
                    canonical.channel,
                    canonical.intent,
                    canonical.state,
                    canonical.idempotencyKey,
                    canonical.provider ?? null,
                    canonical.providerReference ?? null,
                    canonical.requestedAt,
                    canonical.attemptedAt ?? null,
                    canonical.connectedAt ?? null,
                    canonical.completedAt ?? null,
                    canonical.failedAt ?? null,
                    canonical.canceledAt ?? null,
                    canonical.failureCode ?? null,
                    canonical.failureMessage ?? null,
                    booleanStorage(
                        canonical.retryable
                    ),
                    canonical.createdAt,
                    canonical.updatedAt
                )
                .run();

        requireExactlyOneChange(
            result,
            "insert"
        );
    }


    public async updateAttempt(
        attempt:
            InsuranceContactAttempt
    ):
        Promise<void> {

        const canonical =
            createInsuranceContactAttempt(
                attempt
            );

        const result =
            await this.database
                .prepare(
                    `
                        UPDATE river_crm_contact_attempts
                        SET
                            trigger_event_id = ?1,
                            state = ?2,
                            provider = ?3,
                            provider_reference = ?4,
                            attempted_at = ?5,
                            connected_at = ?6,
                            completed_at = ?7,
                            failed_at = ?8,
                            canceled_at = ?9,
                            failure_code = ?10,
                            failure_message = ?11,
                            retryable = ?12,
                            updated_at = ?13
                        WHERE
                            attempt_id = ?14
                            AND relationship_id = ?15
                            AND channel = ?16
                            AND intent = ?17
                            AND idempotency_key = ?18
                            AND requested_at = ?19
                            AND created_at = ?20
                    `
                )
                .bind(
                    canonical.triggerEventId ?? null,
                    canonical.state,
                    canonical.provider ?? null,
                    canonical.providerReference ?? null,
                    canonical.attemptedAt ?? null,
                    canonical.connectedAt ?? null,
                    canonical.completedAt ?? null,
                    canonical.failedAt ?? null,
                    canonical.canceledAt ?? null,
                    canonical.failureCode ?? null,
                    canonical.failureMessage ?? null,
                    booleanStorage(
                        canonical.retryable
                    ),
                    canonical.updatedAt,
                    canonical.attemptId,
                    canonical.relationshipId,
                    canonical.channel,
                    canonical.intent,
                    canonical.idempotencyKey,
                    canonical.requestedAt,
                    canonical.createdAt
                )
                .run();

        requireExactlyOneChange(
            result,
            "update"
        );
    }


    public async getAttempt(
        attemptId:
            InsuranceContactAttemptId | string
    ):
        Promise<
            InsuranceContactAttempt |
            undefined
        > {

        const canonicalAttemptId =
            createInsuranceContactAttemptId(
                attemptId
            );

        const row =
            await this.database
                .prepare(
                    `
                        SELECT
                            attempt_id,
                            relationship_id,
                            trigger_event_id,
                            channel,
                            intent,
                            state,
                            idempotency_key,
                            provider,
                            provider_reference,
                            requested_at,
                            attempted_at,
                            connected_at,
                            completed_at,
                            failed_at,
                            canceled_at,
                            failure_code,
                            failure_message,
                            retryable,
                            created_at,
                            updated_at
                        FROM river_crm_contact_attempts
                        WHERE attempt_id = ?1
                        LIMIT 1
                    `
                )
                .bind(
                    canonicalAttemptId
                )
                .first<
                    InsuranceContactAttemptRow
                >();

        return row === null
            ? undefined
            : rowToAttempt(
                row
            );
    }


    public async getAttemptByIdempotencyKey(
        idempotencyKey:
            string
    ):
        Promise<
            InsuranceContactAttempt |
            undefined
        > {

        const canonicalIdempotencyKey =
            requiredText(
                idempotencyKey,
                "idempotency_key"
            );

        const row =
            await this.database
                .prepare(
                    `
                        SELECT
                            attempt_id,
                            relationship_id,
                            trigger_event_id,
                            channel,
                            intent,
                            state,
                            idempotency_key,
                            provider,
                            provider_reference,
                            requested_at,
                            attempted_at,
                            connected_at,
                            completed_at,
                            failed_at,
                            canceled_at,
                            failure_code,
                            failure_message,
                            retryable,
                            created_at,
                            updated_at
                        FROM river_crm_contact_attempts
                        WHERE idempotency_key = ?1
                        LIMIT 1
                    `
                )
                .bind(
                    canonicalIdempotencyKey
                )
                .first<
                    InsuranceContactAttemptRow
                >();

        return row === null
            ? undefined
            : rowToAttempt(
                row
            );
    }


    public async getAttemptByProviderReference(
        provider:
            string,
        providerReference:
            string
    ):
        Promise<
            InsuranceContactAttempt |
            undefined
        > {

        const canonicalProvider =
            requiredText(
                provider,
                "provider"
            );

        const canonicalProviderReference =
            requiredText(
                providerReference,
                "provider_reference"
            );

        const row =
            await this.database
                .prepare(
                    `
                        SELECT
                            attempt_id,
                            relationship_id,
                            trigger_event_id,
                            channel,
                            intent,
                            state,
                            idempotency_key,
                            provider,
                            provider_reference,
                            requested_at,
                            attempted_at,
                            connected_at,
                            completed_at,
                            failed_at,
                            canceled_at,
                            failure_code,
                            failure_message,
                            retryable,
                            created_at,
                            updated_at
                        FROM river_crm_contact_attempts
                        WHERE
                            provider = ?1
                            AND provider_reference = ?2
                        LIMIT 1
                    `
                )
                .bind(
                    canonicalProvider,
                    canonicalProviderReference
                )
                .first<
                    InsuranceContactAttemptRow
                >();

        return row === null
            ? undefined
            : rowToAttempt(
                row
            );
    }


    public async listAttemptsForRelationship(
        relationshipId:
            RiverCrmRelationshipId | string,
        limit:
            number = 50
    ):
        Promise<
            readonly InsuranceContactAttempt[]
        > {

        const canonicalRelationshipId =
            requireRelationshipId(
                relationshipId
            );

        const canonicalLimit =
            requireLimit(
                limit
            );

        const result =
            await this.database
                .prepare(
                    `
                        SELECT
                            attempt_id,
                            relationship_id,
                            trigger_event_id,
                            channel,
                            intent,
                            state,
                            idempotency_key,
                            provider,
                            provider_reference,
                            requested_at,
                            attempted_at,
                            connected_at,
                            completed_at,
                            failed_at,
                            canceled_at,
                            failure_code,
                            failure_message,
                            retryable,
                            created_at,
                            updated_at
                        FROM river_crm_contact_attempts
                        WHERE relationship_id = ?1
                        ORDER BY
                            requested_at DESC,
                            attempt_id ASC
                        LIMIT ?2
                    `
                )
                .bind(
                    canonicalRelationshipId,
                    canonicalLimit
                )
                .all<
                    InsuranceContactAttemptRow
                >();

        if(result.success === false){
            throw new Error(
                "Insurance contact-attempt D1 list failed."
            );
        }

        return (
            result.results ?? []
        ).map(
            rowToAttempt
        );
    }


    public async listAttemptsForRelationships(
        relationshipIds:
            readonly (
                RiverCrmRelationshipId |
                string
            )[],
        limitPerRelationship:
            number = 5
    ):
        Promise<
            readonly InsuranceContactAttempt[]
        > {

        const canonicalLimit =
            requireLimit(
                limitPerRelationship
            );

        const canonicalRelationshipIds =
            [
                ...new Set(
                    relationshipIds.map(
                        relationshipId =>
                            requireRelationshipId(
                                relationshipId
                            )
                    )
                )
            ];

        if(
            canonicalRelationshipIds.length ===
                0
        ){
            return [];
        }

        const attempts:
            InsuranceContactAttempt[] =
                [];

        const relationshipChunkSize =
            100;

        for(
            let offset = 0;
            offset <
                canonicalRelationshipIds.length;
            offset +=
                relationshipChunkSize
        ){
            const chunk =
                canonicalRelationshipIds.slice(
                    offset,
                    offset +
                        relationshipChunkSize
                );

            const parameterList =
                chunk
                    .map(
                        () =>
                            "?"
                    )
                    .join(
                        ", "
                    );

            const result =
                await this.database
                    .prepare(
                        `
                            SELECT
                                attempt_id,
                                relationship_id,
                                trigger_event_id,
                                channel,
                                intent,
                                state,
                                idempotency_key,
                                provider,
                                provider_reference,
                                requested_at,
                                attempted_at,
                                connected_at,
                                completed_at,
                                failed_at,
                                canceled_at,
                                failure_code,
                                failure_message,
                                retryable,
                                created_at,
                                updated_at
                        FROM (
                                SELECT
                                    attempt_id,
                                    relationship_id,
                                    trigger_event_id,
                                    channel,
                                    intent,
                                    state,
                                    idempotency_key,
                                    provider,
                                    provider_reference,
                                    requested_at,
                                  attempted_at,
                                  connected_at,
                                    completed_at,
                                    failed_at,
                                    canceled_at,
                                    failure_code,
                                    failure_message,
                                    retryable,
                                    created_at,
                                    updated_at,
                                    ROW_NUMBER() OVER (
                                        PARTITION BY relationship_id
                                        ORDER BY
                                            requested_at DESC,
                                            attempt_id ASC
                                    ) AS river_attempt_rank
                                FROM river_crm_contact_attempts
                                WHERE relationship_id IN (${parameterList})
                            )
                            WHERE river_attempt_rank <= ${canonicalLimit}
                            ORDER BY
                                relationship_id ASC,
                                requested_at DESC,
                                attempt_id ASC
                        `
                    )
                    .bind(
                        ...chunk
                    )
                    .all<
                        InsuranceContactAttemptRow
                    >();

            if(result.success === false){
                throw new Error(
                    "Insurance contact-attempt D1 cohort list failed."
                );
            }

            attempts.push(
                ...(
                    result.results ??
                    []
                ).map(
                    rowToAttempt
                )
            );
        }

        return attempts;
    }


    public async recordProviderEventReceipt(
        receipt:
            InsuranceContactProviderEventReceipt
    ):
        Promise<boolean> {

        const canonical =
            validateProviderEventReceipt(
                receipt
            );

        const result =
            await this.database
                .prepare(
                    `
                        INSERT OR IGNORE INTO
                            river_crm_contact_provider_events (
                                provider,
                                provider_event_id,
                                attempt_id,
                                received_at
                            )
                        VALUES (
                            ?1,
                            ?2,
                            ?3,
                            ?4
                        )
                    `
                )
                .bind(
                    canonical.provider,
                    canonical.providerEventId,
                    canonical.attemptId ?? null,
                    canonical.receivedAt
                )
                .run();

        assertRunSucceeded(
            result,
            "provider-event receipt"
        );

        const changes =
            result.meta?.changes;

        if(
            changes !== 0 &&
            changes !== 1
        ){
            throw new Error(
                "Insurance contact-attempt D1 provider-event receipt returned an invalid changed-row count."
            );
        }

        return changes === 1;
    }
}


export function createD1InsuranceContactAttemptPersistence(
    database:
        RiverCrmD1Database
):
    InsuranceContactAttemptPersistence {

    return new D1InsuranceContactAttemptPersistence(
        database
    );
}
