import {
    createInsuranceContactAttemptId
} from "./contact-attempt";

import {
    createTelnyxCallBridge,
    transitionTelnyxCallBridge
} from "./telnyx-call-bridge";

import type {
    InsuranceContactAttemptId
} from "./contact-attempt";

import type {
    TelnyxCallBridge,
    TelnyxCallBridgeState
} from "./telnyx-call-bridge";


export interface TelnyxCallBridgeD1RunResult {
    readonly success?:
        boolean;

    readonly meta?: {
        readonly changes?:
            number;
    };
}


export interface TelnyxCallBridgeD1Statement {
    bind(
        ...values:
            unknown[]
    ):
        TelnyxCallBridgeD1Statement;

    first<T>():
        Promise<
            T |
            null
        >;

    run():
        Promise<
            TelnyxCallBridgeD1RunResult
        >;
}


export interface TelnyxCallBridgeD1Database {
    prepare(
        sql:
            string
    ):
        TelnyxCallBridgeD1Statement;
}


interface TelnyxCallBridgeRow {
    readonly attempt_id:
        string;

    readonly state:
        string;

    readonly operator_call_control_id:
        string |
        null;

    readonly lead_call_control_id:
        string |
        null;

    readonly failure_code:
        string |
        null;

    readonly created_at:
        string;

    readonly updated_at:
        string;
}


export type CompareAndSetTelnyxCallBridgeResult =
    | {
        readonly updated:
            true;

        readonly bridge:
            TelnyxCallBridge;
    }
    | {
        readonly updated:
            false;

        readonly reason:
            "stale-bridge";
    };


export interface TelnyxCallBridgePersistence {
    insertBridge(
        bridge:
            TelnyxCallBridge
    ):
        Promise<
            TelnyxCallBridge
        >;

    getBridge(
        attemptId:
            InsuranceContactAttemptId
    ):
        Promise<
            TelnyxCallBridge |
            undefined
        >;

    compareAndSetBridge(
        previous:
            TelnyxCallBridge,
        next:
            TelnyxCallBridge
    ):
        Promise<
            CompareAndSetTelnyxCallBridgeResult
        >;
}


const VALID_STATES:
    ReadonlySet<
        TelnyxCallBridgeState
    > =
        new Set([
            "operator-dial-requested",
            "operator-answered",
            "lead-dial-requested",
            "lead-answered",
            "bridge-requested",
            "bridged",
            "completed",
            "failed"
        ]);


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
            `Telnyx bridge persistence requires ${field}.`
        );
    }

    return value.trim();
}


function optionalText(
    value:
        unknown
):
    string |
    undefined {

    if(
        value ===
            undefined ||
        value ===
            null
    ){
        return undefined;
    }

    if(
        typeof value !==
            "string" ||
        value.trim().length ===
            0
    ){
        throw new TypeError(
            "Telnyx bridge persistence optional text must be non-blank when present."
        );
    }

    return value.trim();
}


function state(
    value:
        unknown
):
    TelnyxCallBridgeState {

    const text =
        requiredText(
            value,
            "state"
        );

    if(
        !VALID_STATES.has(
            text as
                TelnyxCallBridgeState
        )
    ){
        throw new TypeError(
            "Telnyx bridge persistence encountered unsupported state."
        );
    }

    return text as
        TelnyxCallBridgeState;
}


function hydrate(
    row:
        TelnyxCallBridgeRow
):
    TelnyxCallBridge {

    const attemptId =
        createInsuranceContactAttemptId(
            requiredText(
                row.attempt_id,
                "attempt_id"
            )
        );

    const rowState =
        state(
            row.state
        );

    const createdAt =
        requiredText(
            row.created_at,
            "created_at"
        );

    const updatedAt =
        requiredText(
            row.updated_at,
            "updated_at"
        );

    const operatorCallControlId =
        optionalText(
            row.operator_call_control_id
        );

    const leadCallControlId =
        optionalText(
            row.lead_call_control_id
        );

    const failureCode =
        optionalText(
            row.failure_code
        );

    let bridge =
        createTelnyxCallBridge({
            attemptId,
            createdAt
        });

    if(
        rowState ===
            "operator-dial-requested"
    ){
        return bridge;
    }

    const transitions:
        readonly TelnyxCallBridgeState[] = [
            "operator-answered",
            "lead-dial-requested",
            "lead-answered",
            "bridge-requested",
            "bridged",
            "completed"
        ];

    for(const nextState of transitions){
        if(
            rowState ===
                "failed"
        ){
            break;
        }

        bridge =
            transitionTelnyxCallBridge(
                bridge,
                nextState,
                updatedAt,
                {
                    ...(operatorCallControlId !==
                        undefined
                        ? {
                            operatorCallControlId
                        }
                        : {}),
                    ...(leadCallControlId !==
                        undefined
                        ? {
                            leadCallControlId
                        }
                        : {})
                }
            );

        if(nextState === rowState){
            return bridge;
        }
    }

    if(rowState === "failed"){
        return transitionTelnyxCallBridge(
            bridge,
            "failed",
            updatedAt,
            {
                ...(operatorCallControlId !==
                    undefined
                    ? {
                        operatorCallControlId
                    }
                    : {}),
                ...(leadCallControlId !==
                    undefined
                    ? {
                        leadCallControlId
                    }
                    : {}),
                failureCode:
                    requiredText(
                        failureCode,
                        "failure_code"
                    )
            }
        );
    }

    throw new Error(
        "Telnyx bridge persistence could not hydrate bridge state."
    );
}


function assertWriteSucceeded(
    result:
        TelnyxCallBridgeD1RunResult,
    operation:
        string
):
    void {

    if(result.success === false){
        throw new Error(
            `Telnyx bridge persistence ${operation} failed.`
        );
    }
}


function assertSameBridgeIdentity(
    previous:
        TelnyxCallBridge,
    next:
        TelnyxCallBridge
):
    void {

    if(
        previous.attemptId !==
        next.attemptId
    ){
        throw new Error(
            "Telnyx bridge persistence cannot change canonical attempt identity."
        );
    }

    if(
        previous.createdAt !==
        next.createdAt
    ){
        throw new Error(
            "Telnyx bridge persistence cannot change bridge createdAt."
        );
    }
}


export class D1TelnyxCallBridgePersistence
implements TelnyxCallBridgePersistence {

    public constructor(
        private readonly database:
            TelnyxCallBridgeD1Database
    ){}


    public async insertBridge(
        bridge:
            TelnyxCallBridge
    ):
        Promise<
            TelnyxCallBridge
        > {

        const result =
            await this.database
                .prepare(`
                    INSERT INTO river_crm_contact_call_bridges (
                        attempt_id,
                        state,
                        operator_call_control_id,
                        lead_call_control_id,
                        failure_code,
                        created_at,
                        updated_at
                    )
                    VALUES (
                        ?1,
                        ?2,
                        ?3,
                        ?4,
                        ?5,
                        ?6,
                        ?7
                    )
                `)
                .bind(
                    bridge.attemptId,
                    bridge.state,
                    bridge.operatorCallControlId ??
                        null,
                    bridge.leadCallControlId ??
                        null,
                    bridge.failureCode ??
                        null,
                    bridge.createdAt,
                    bridge.updatedAt
                )
                .run();

        assertWriteSucceeded(
            result,
            "insert"
        );

        if(
            result.meta?.changes !==
                undefined &&
            result.meta.changes !==
                1
        ){
            throw new Error(
                "Telnyx bridge persistence insert expected exactly one row."
            );
        }

        return bridge;
    }


    public async getBridge(
        attemptId:
            InsuranceContactAttemptId
    ):
        Promise<
            TelnyxCallBridge |
            undefined
        > {

        const row =
            await this.database
                .prepare(`
                    SELECT
                        attempt_id,
                        state,
                        operator_call_control_id,
                        lead_call_control_id,
                        failure_code,
                        created_at,
                        updated_at
                    FROM river_crm_contact_call_bridges
                    WHERE attempt_id = ?1
                    LIMIT 1
                `)
                .bind(
                    attemptId
                )
                .first<
                    TelnyxCallBridgeRow
                >();

        return row === null
            ? undefined
            : hydrate(
                row
            );
    }


    public async compareAndSetBridge(
        previous:
            TelnyxCallBridge,
        next:
            TelnyxCallBridge
    ):
        Promise<
            CompareAndSetTelnyxCallBridgeResult
        > {

        assertSameBridgeIdentity(
            previous,
            next
        );

        const result =
            await this.database
                .prepare(`
                    UPDATE river_crm_contact_call_bridges
                    SET
                        state = ?2,
                        operator_call_control_id = ?3,
                        lead_call_control_id = ?4,
                        failure_code = ?5,
                        updated_at = ?6
                    WHERE attempt_id = ?1
                      AND state = ?7
                      AND updated_at = ?8
                `)
                .bind(
                    next.attemptId,
                    next.state,
                    next.operatorCallControlId ??
                        null,
                    next.leadCallControlId ??
                        null,
                    next.failureCode ??
                        null,
                    next.updatedAt,
                    previous.state,
                    previous.updatedAt
                )
                .run();

        assertWriteSucceeded(
            result,
            "compare-and-set update"
        );

        const changes =
            result.meta?.changes;

        if(changes === 0){
            return {
                updated:
                    false,
                reason:
                    "stale-bridge"
            };
        }

        if(
            changes !==
                undefined &&
            changes !==
                1
        ){
            throw new Error(
                "Telnyx bridge persistence compare-and-set expected zero or one changed row."
            );
        }

        return {
            updated:
                true,
            bridge:
                next
        };
    }
}


export function createD1TelnyxCallBridgePersistence(
    database:
        TelnyxCallBridgeD1Database
):
    TelnyxCallBridgePersistence {

    return new D1TelnyxCallBridgePersistence(
        database
    );
}
