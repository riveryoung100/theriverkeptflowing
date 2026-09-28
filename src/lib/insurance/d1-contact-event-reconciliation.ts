import {
    createInsuranceContactAttempt,
    type InsuranceContactAttempt
} from "./contact-attempt";

import type {
    TelnyxAttemptReconciliationPlan
} from "./telnyx-event-reconciliation";

import type {
    TelnyxVoiceEvent
} from "./telnyx-voice-event";


export interface InsuranceContactReconciliationD1RunResult {
    readonly success?:
        boolean;

    readonly meta?: {
        readonly changes?:
            number;
    };
}


export interface InsuranceContactReconciliationD1Statement {
    bind(
        ...values:
            unknown[]
    ):
        InsuranceContactReconciliationD1Statement;

    run():
        Promise<
            InsuranceContactReconciliationD1RunResult
        >;
}


export interface InsuranceContactReconciliationD1Database {
    prepare(
        sql:
            string
    ):
        InsuranceContactReconciliationD1Statement;
}


export interface ExecuteTelnyxContactEventReconciliationInput {
    readonly event:
        TelnyxVoiceEvent;

    readonly plan:
        TelnyxAttemptReconciliationPlan;

    readonly receivedAt:
        string;
}


export type ExecuteTelnyxContactEventReconciliationResult =
    | {
        readonly ok:
            true;

        readonly duplicate:
            boolean;

        readonly attemptUpdated:
            boolean;
    }
    | {
        readonly ok:
            false;

        readonly reason:
            "stale-attempt";

        readonly retryable:
            true;
    };


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
            `Insurance contact-event reconciliation requires ${field}.`
        );
    }

    return value.trim();
}


function requiredTimestamp(
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
            `Insurance contact-event reconciliation requires ${field} to be a valid timestamp.`
        );
    }

    return text;
}


function booleanStorage(
    value:
        boolean | undefined
):
    number | null {

    return value ===
        undefined
        ? null
        : (
            value
                ? 1
                : 0
        );
}


function currentAttempt(
    plan:
        TelnyxAttemptReconciliationPlan
):
    InsuranceContactAttempt {

    return createInsuranceContactAttempt(
        plan.kind ===
            "update"
            ? plan.previous
            : plan.attempt
    );
}


function assertIdentity(
    event:
        TelnyxVoiceEvent,
    plan:
        TelnyxAttemptReconciliationPlan
):
    InsuranceContactAttempt {

    if(event.provider !== "telnyx"){
        throw new Error(
            "Insurance contact-event reconciliation requires Telnyx normalized evidence."
        );
    }

    const current =
        currentAttempt(
            plan
        );

    if(current.provider !== "telnyx"){
        throw new Error(
            "Insurance contact-event reconciliation requires a Telnyx contact attempt."
        );
    }

    if(
        current.providerReference !==
            event.callControlId
    ){
        throw new Error(
            "Insurance contact-event reconciliation requires matching providerReference and callControlId."
        );
    }

    return current;
}


function assertRunSucceeded(
    result:
        InsuranceContactReconciliationD1RunResult,
    operation:
        string
):
    void {

    if(result.success === false){
        throw new Error(
            `Insurance contact-event reconciliation D1 ${operation} failed.`
        );
    }
}


function changedRows(
    result:
        InsuranceContactReconciliationD1RunResult,
    operation:
        string
):
    number {

    assertRunSucceeded(
        result,
        operation
    );

    const changes =
        result.meta?.changes;

    if(
        changes !== 0 &&
        changes !== 1
    ){
        throw new Error(
            `Insurance contact-event reconciliation D1 ${operation} returned an invalid changed-row count.`
        );
    }

    return changes;
}


async function recordReceipt(
    database:
        InsuranceContactReconciliationD1Database,
    event:
        TelnyxVoiceEvent,
    attempt:
        InsuranceContactAttempt,
    receivedAt:
        string
):
    Promise<boolean> {

    const result =
        await database
            .prepare(`
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
            `)
            .bind(
                event.provider,
                event.providerEventId,
                attempt.attemptId,
                receivedAt
            )
            .run();

    return changedRows(
        result,
        "provider-event receipt"
    ) === 1;
}


async function compareAndSwapAttempt(
    database:
        InsuranceContactReconciliationD1Database,
    previous:
        InsuranceContactAttempt,
    next:
        InsuranceContactAttempt
):
    Promise<boolean> {

    const before =
        createInsuranceContactAttempt(
            previous
        );

    const after =
        createInsuranceContactAttempt(
            next
        );

    if(
        before.attemptId !== after.attemptId ||
        before.relationshipId !== after.relationshipId ||
        before.channel !== after.channel ||
        before.intent !== after.intent ||
        before.idempotencyKey !== after.idempotencyKey ||
        before.requestedAt !== after.requestedAt ||
        before.createdAt !== after.createdAt
    ){
        throw new Error(
            "Insurance contact-event reconciliation cannot change immutable attempt identity."
        );
    }

    const result =
        await database
            .prepare(`
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
                    AND state = ?21
                    AND updated_at = ?22
            `)
            .bind(
                after.triggerEventId ?? null,
                after.state,
                after.provider ?? null,
                after.providerReference ?? null,
                after.attemptedAt ?? null,
                after.connectedAt ?? null,
                after.completedAt ?? null,
                after.failedAt ?? null,
                after.canceledAt ?? null,
                after.failureCode ?? null,
                after.failureMessage ?? null,
                booleanStorage(
                    after.retryable
                ),
                after.updatedAt,
                after.attemptId,
                after.relationshipId,
                after.channel,
                after.intent,
                after.idempotencyKey,
                after.requestedAt,
                after.createdAt,
                before.state,
                before.updatedAt
            )
            .run();

    return changedRows(
        result,
        "attempt compare-and-swap"
    ) === 1;
}


export function createD1InsuranceContactEventReconciliationExecutor(
    database:
        InsuranceContactReconciliationD1Database
){
    return {
        async execute(
            input:
                ExecuteTelnyxContactEventReconciliationInput
        ):
            Promise<
                ExecuteTelnyxContactEventReconciliationResult
            > {

            const current =
                assertIdentity(
                    input.event,
                    input.plan
                );

            const receivedAt =
                requiredTimestamp(
                    input.receivedAt,
                    "receivedAt"
                );

            if(
                input.plan.kind ===
                    "no-op"
            ){
                const inserted =
                    await recordReceipt(
                        database,
                        input.event,
                        current,
                        receivedAt
                    );

                return {
                    ok:
                        true,
                    duplicate:
                        !inserted,
                    attemptUpdated:
                        false
                };
            }

            const updated =
                await compareAndSwapAttempt(
                    database,
                    input.plan.previous,
                    input.plan.next
                );

            if(!updated){
                return {
                    ok:
                        false,
                    reason:
                        "stale-attempt",
                    retryable:
                        true
                };
            }

            const inserted =
                await recordReceipt(
                    database,
                    input.event,
                    input.plan.next,
                    receivedAt
                );

            return {
                ok:
                    true,
                duplicate:
                    !inserted,
                attemptUpdated:
                    true
            };
        }
    };
}
