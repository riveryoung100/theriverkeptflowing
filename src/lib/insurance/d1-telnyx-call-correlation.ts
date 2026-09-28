import {
    createTelnyxCallLegCorrelation,
    type TelnyxCallLegCorrelation,
    type TelnyxCallLegRole
} from "./telnyx-call-correlation";

import type {
    InsuranceContactAttemptId
} from "./contact-attempt";


export interface TelnyxCallCorrelationD1RunResult {
    readonly success?:
        boolean;

    readonly meta?: {
        readonly changes?:
            number;
    };
}


export interface TelnyxCallCorrelationD1Statement {
    bind(
        ...values:
            unknown[]
    ):
        TelnyxCallCorrelationD1Statement;

    first<T>():
        Promise<
            T |
            null
        >;

    all<T>():
        Promise<{
            readonly results?:
                readonly T[];
        }>;

    run():
        Promise<
            TelnyxCallCorrelationD1RunResult
        >;
}


export interface TelnyxCallCorrelationD1Database {
    prepare(
        sql:
            string
    ):
        TelnyxCallCorrelationD1Statement;
}


interface TelnyxCallCorrelationRow {
    readonly attempt_id:
        string;

    readonly leg_role:
        string;

    readonly provider:
        string;

    readonly provider_reference:
        string;

    readonly created_at:
        string;

    readonly updated_at:
        string;
}


export interface TelnyxCallLegCorrelationPersistence {
    upsert(
        correlation:
            TelnyxCallLegCorrelation
    ):
        Promise<
            TelnyxCallLegCorrelation
        >;

    getByAttemptAndRole(
        attemptId:
            InsuranceContactAttemptId,
        legRole:
            TelnyxCallLegRole
    ):
        Promise<
            TelnyxCallLegCorrelation |
            undefined
        >;

    getByProviderReference(
        provider:
            "telnyx",
        providerReference:
            string
    ):
        Promise<
            TelnyxCallLegCorrelation |
            undefined
        >;

    listForAttempt(
        attemptId:
            InsuranceContactAttemptId
    ):
        Promise<
            readonly TelnyxCallLegCorrelation[]
        >;
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
            `Telnyx call correlation persistence requires ${field}.`
        );
    }

    return value.trim();
}


function rowToCorrelation(
    row:
        TelnyxCallCorrelationRow
):
    TelnyxCallLegCorrelation {

    if(row.provider !== "telnyx"){
        throw new TypeError(
            "Telnyx call correlation persistence encountered an unsupported provider."
        );
    }

    if(
        row.leg_role !== "operator" &&
        row.leg_role !== "lead"
    ){
        throw new TypeError(
            "Telnyx call correlation persistence encountered an unsupported leg role."
        );
    }

    return createTelnyxCallLegCorrelation({
        attemptId:
            row.attempt_id as
                InsuranceContactAttemptId,
        legRole:
            row.leg_role,
        providerReference:
            row.provider_reference,
        createdAt:
            row.created_at,
        updatedAt:
            row.updated_at
    });
}


function assertWriteSucceeded(
    result:
        TelnyxCallCorrelationD1RunResult
):
    void {

    if(result.success === false){
        throw new Error(
            "Telnyx call correlation persistence write failed."
        );
    }

    const changes =
        result.meta?.changes;

    if(
        changes !== undefined &&
        changes !== 1
    ){
        throw new Error(
            "Telnyx call correlation persistence expected exactly one changed row."
        );
    }
}


export function createD1TelnyxCallLegCorrelationPersistence(
    database:
        TelnyxCallCorrelationD1Database
):
    TelnyxCallLegCorrelationPersistence {

    return {
        async upsert(
            correlation
        ){
            const canonical =
                createTelnyxCallLegCorrelation(
                    correlation
                );

            const result =
                await database
                    .prepare(`
                        INSERT INTO river_crm_contact_call_correlations (
                            attempt_id,
                            leg_role,
                            provider,
                            provider_reference,
                            created_at,
                            updated_at
                        )
                        VALUES (
                            ?1,
                            ?2,
                            ?3,
                            ?4,
                            ?5,
                            ?6
                        )
                        ON CONFLICT (
                            attempt_id,
                            leg_role
                        )
                        DO UPDATE SET
                            provider = excluded.provider,
                            provider_reference = excluded.provider_reference,
                            updated_at = excluded.updated_at
                    `)
                    .bind(
                        canonical.attemptId,
                        canonical.legRole,
                        canonical.provider,
                        canonical.providerReference,
                        canonical.createdAt,
                        canonical.updatedAt
                    )
                    .run();

            assertWriteSucceeded(
                result
            );

            return canonical;
        },

        async getByAttemptAndRole(
            attemptId,
            legRole
        ){
            const canonicalAttemptId =
                requiredText(
                    attemptId,
                    "attemptId"
                ) as
                    InsuranceContactAttemptId;

            if(
                legRole !== "operator" &&
                legRole !== "lead"
            ){
                throw new TypeError(
                    "Telnyx call correlation persistence requires legRole operator or lead."
                );
            }

            const row =
                await database
                    .prepare(`
                        SELECT
                            attempt_id,
                            leg_role,
                            provider,
                            provider_reference,
                            created_at,
                            updated_at
                        FROM river_crm_contact_call_correlations
                        WHERE
                            attempt_id = ?1
                            AND leg_role = ?2
                        LIMIT 1
                    `)
                    .bind(
                        canonicalAttemptId,
                        legRole
                    )
                    .first<TelnyxCallCorrelationRow>();

            return row === null
                ? undefined
                : rowToCorrelation(
                    row
                );
        },

        async getByProviderReference(
            provider,
            providerReference
        ){
            if(provider !== "telnyx"){
                throw new TypeError(
                    "Telnyx call correlation persistence requires provider telnyx."
                );
            }

            const canonicalProviderReference =
                requiredText(
                    providerReference,
                    "providerReference"
                );

            const row =
                await database
                    .prepare(`
                        SELECT
                            attempt_id,
                            leg_role,
                            provider,
                            provider_reference,
                            created_at,
                            updated_at
                        FROM river_crm_contact_call_correlations
                        WHERE
                            provider = ?1
                            AND provider_reference = ?2
                        LIMIT 1
                    `)
                    .bind(
                        provider,
                        canonicalProviderReference
                    )
                    .first<TelnyxCallCorrelationRow>();

            return row === null
                ? undefined
                : rowToCorrelation(
                    row
                );
        },

        async listForAttempt(
            attemptId
        ){
            const canonicalAttemptId =
                requiredText(
                    attemptId,
                    "attemptId"
                ) as
                    InsuranceContactAttemptId;

            const result =
                await database
                    .prepare(`
                        SELECT
                            attempt_id,
                            leg_role,
                            provider,
                            provider_reference,
                            created_at,
                            updated_at
                        FROM river_crm_contact_call_correlations
                        WHERE attempt_id = ?1
                        ORDER BY
                            CASE leg_role
                                WHEN 'operator' THEN 0
                                ELSE 1
                            END ASC
                    `)
                    .bind(
                        canonicalAttemptId
                    )
                    .all<TelnyxCallCorrelationRow>();

            return (
                result.results ??
                []
            ).map(
                rowToCorrelation
            );
        }
    };
}
