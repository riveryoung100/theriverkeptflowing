import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";

import type {
    InsuranceGrowthIntegrationContext
} from "./integration-boundary";

export const INSURANCE_CONTACT_ATTEMPT_ID_PREFIX =
    "contact-attempt:" as const;

export const INSURANCE_CONTACT_ATTEMPT_CHANNELS = [
    "phone",
    "sms",
    "email"
] as const;

export const INSURANCE_CONTACT_ATTEMPT_INTENTS = [
    "instant-contact",
    "callback"
] as const;

export const INSURANCE_CONTACT_ATTEMPT_STATES = [
    "queued",
    "attempting",
    "connected",
    "completed",
    "failed",
    "canceled"
] as const;

export const INSURANCE_CONTACT_ELIGIBILITY_DENIAL_REASONS = [
    "channel-missing",
    "consent-not-granted",
    "channel-suppressed",
    "relationship-suppressed"
] as const;

export type InsuranceContactAttemptId =
    string & {
        readonly __brand:
            "InsuranceContactAttemptId";
    };

export type InsuranceContactIdempotencyKey =
    string & {
        readonly __brand:
            "InsuranceContactIdempotencyKey";
    };

export type InsuranceContactChannel =
    typeof INSURANCE_CONTACT_ATTEMPT_CHANNELS[number];

export type InsuranceContactIntent =
    typeof INSURANCE_CONTACT_ATTEMPT_INTENTS[number];

export type InsuranceContactAttemptState =
    typeof INSURANCE_CONTACT_ATTEMPT_STATES[number];

export type InsuranceContactEligibilityDenialReason =
    typeof INSURANCE_CONTACT_ELIGIBILITY_DENIAL_REASONS[number];

export interface InsuranceContactAttempt {
    readonly attemptId:
        InsuranceContactAttemptId;

    readonly relationshipId:
        RiverCrmRelationshipId;

    readonly channel:
        InsuranceContactChannel;

    readonly intent:
        InsuranceContactIntent;

    readonly state:
        InsuranceContactAttemptState;

    readonly idempotencyKey:
        InsuranceContactIdempotencyKey;

    readonly requestedAt:
        string;

    readonly createdAt:
        string;

    readonly updatedAt:
        string;

    readonly triggerEventId?:
        string;

    readonly provider?:
        string;

    readonly providerReference?:
        string;

    readonly attemptedAt?:
        string;

    readonly connectedAt?:
        string;

    readonly completedAt?:
        string;

    readonly failedAt?:
        string;

    readonly canceledAt?:
        string;

    readonly failureCode?:
        string;

    readonly failureMessage?:
        string;

    readonly retryable?:
        boolean;
}

export interface CreateInsuranceContactAttemptInput {
    readonly attemptId:
        unknown;

    readonly relationshipId:
        RiverCrmRelationshipId;

    readonly channel:
        unknown;

    readonly intent:
        unknown;

    readonly state:
        unknown;

    readonly idempotencyKey:
        unknown;

    readonly requestedAt:
        unknown;

    readonly createdAt:
        unknown;

    readonly updatedAt:
        unknown;

    readonly triggerEventId?:
        unknown;

    readonly provider?:
        unknown;

    readonly providerReference?:
        unknown;

    readonly attemptedAt?:
        unknown;

    readonly connectedAt?:
        unknown;

    readonly completedAt?:
        unknown;

    readonly failedAt?:
        unknown;

    readonly canceledAt?:
        unknown;

    readonly failureCode?:
        unknown;

    readonly failureMessage?:
        unknown;

    readonly retryable?:
        unknown;
}

export type InsuranceContactEligibility =
    | {
        readonly eligible:
            true;
      }
    | {
        readonly eligible:
            false;

        readonly reason:
            InsuranceContactEligibilityDenialReason;
      };

export interface InsuranceContactProviderRequest {
    readonly attemptId:
        InsuranceContactAttemptId;

    readonly relationshipId:
        RiverCrmRelationshipId;

    readonly channel:
        InsuranceContactChannel;

    readonly intent:
        InsuranceContactIntent;

    readonly idempotencyKey:
        InsuranceContactIdempotencyKey;
}

export type InsuranceContactProviderResult =
    | {
        readonly accepted:
            true;

        readonly providerReference?:
            string;

        readonly providerState?:
            string;
      }
    | {
        readonly accepted:
            false;

        readonly code:
            string;

        readonly message:
            string;

        readonly retryable:
            boolean;
      };

export interface InsuranceContactProvider {
    requestContact(
        request:
            InsuranceContactProviderRequest
    ):
        Promise<
            InsuranceContactProviderResult
        >;
}

function requiredText(
    value:
        unknown,
    label:
        string
):
    string {

    if(
        typeof value !==
            "string" ||
        value.trim().length ===
            0
    ){
        throw new Error(
            `${label} must be non-empty text.`
        );
    }

    return value.trim();
}

function optionalText(
    value:
        unknown,
    label:
        string
):
    string | undefined {

    if(
        value ===
            undefined
    ){
        return undefined;
    }

    return requiredText(
        value,
        label
    );
}

function timestamp(
    value:
        unknown,
    label:
        string
):
    string {

    const text =
        requiredText(
            value,
            label
        );

    if(
        Number.isNaN(
            Date.parse(
                text
            )
        )
    ){
        throw new Error(
            `${label} must be a valid timestamp.`
        );
    }

    return text;
}

function optionalTimestamp(
    value:
        unknown,
    label:
        string
):
    string | undefined {

    if(
        value ===
            undefined
    ){
        return undefined;
    }

    return timestamp(
        value,
        label
    );
}

function oneOf<
    const TValues extends
        readonly string[]
>(
    value:
        unknown,
    values:
        TValues,
    label:
        string
):
    TValues[number] {

    const text =
        requiredText(
            value,
            label
        );

    if(
        !values.includes(
            text
        )
    ){
        throw new Error(
            `${label} is unsupported.`
        );
    }

    return text;
}

export function createInsuranceContactAttemptId(
    value:
        unknown
):
    InsuranceContactAttemptId {

    const text =
        requiredText(
            value,
            "Insurance contact attempt ID"
        );

    if(
        !text.startsWith(
            INSURANCE_CONTACT_ATTEMPT_ID_PREFIX
        ) ||
        text.length ===
            INSURANCE_CONTACT_ATTEMPT_ID_PREFIX.length
    ){
        throw new Error(
            `Insurance contact attempt ID must start with ${INSURANCE_CONTACT_ATTEMPT_ID_PREFIX} and include a suffix.`
        );
    }

    return text as
        InsuranceContactAttemptId;
}

export function createInsuranceContactIdempotencyKey(
    value:
        unknown
):
    InsuranceContactIdempotencyKey {

    return requiredText(
        value,
        "Insurance contact idempotency key"
    ) as
        InsuranceContactIdempotencyKey;
}

function validateStateFields(
    attempt:
        InsuranceContactAttempt
):
    void {

    const failureFieldsPresent =
        attempt.failureCode !==
            undefined ||
        attempt.failureMessage !==
            undefined ||
        attempt.retryable !==
            undefined ||
        attempt.failedAt !==
            undefined;

    if(
        attempt.providerReference !==
            undefined &&
        attempt.provider ===
            undefined
    ){
        throw new Error(
            "Provider reference requires provider."
        );
    }

    if(
        attempt.state !==
            "failed" &&
        failureFieldsPresent
    ){
        throw new Error(
            "Failure fields are only valid for failed attempts."
        );
    }

    if(
        attempt.state ===
            "failed"
    ){
        if(
            attempt.failedAt ===
                undefined ||
            attempt.failureCode ===
                undefined ||
            attempt.failureMessage ===
                undefined ||
            attempt.retryable ===
                undefined
        ){
            throw new Error(
                "Failed attempts require failedAt, failureCode, failureMessage, and retryable."
            );
        }
    }

    if(
        attempt.state ===
            "attempting" &&
        attempt.attemptedAt ===
            undefined
    ){
        throw new Error(
            "Attempting attempts require attemptedAt."
        );
    }

    if(
        attempt.state ===
            "connected" &&
        (
            attempt.attemptedAt ===
                undefined ||
            attempt.connectedAt ===
                undefined
        )
    ){
        throw new Error(
            "Connected attempts require attemptedAt and connectedAt."
        );
    }

    if(
        attempt.state ===
            "completed" &&
        attempt.completedAt ===
            undefined
    ){
        throw new Error(
            "Completed attempts require completedAt."
        );
    }

    if(
        attempt.state ===
            "canceled" &&
        attempt.canceledAt ===
            undefined
    ){
        throw new Error(
            "Canceled attempts require canceledAt."
        );
    }
}

export function createInsuranceContactAttempt(
    input:
        CreateInsuranceContactAttemptInput
):
    InsuranceContactAttempt {

    const provider =
        optionalText(
            input.provider,
            "Provider"
        );

    const providerReference =
        optionalText(
            input.providerReference,
            "Provider reference"
        );

    const triggerEventId =
        optionalText(
            input.triggerEventId,
            "Trigger event ID"
        );

    const failureCode =
        optionalText(
            input.failureCode,
            "Failure code"
        );

    const failureMessage =
        optionalText(
            input.failureMessage,
            "Failure message"
        );

    if(
        input.retryable !==
            undefined &&
        typeof input.retryable !==
            "boolean"
    ){
        throw new Error(
            "Retryable must be boolean."
        );
    }

    const attempt:
        InsuranceContactAttempt = {
            attemptId:
                createInsuranceContactAttemptId(
                    input.attemptId
                ),

            relationshipId:
                input.relationshipId,

            channel:
                oneOf(
                    input.channel,
                    INSURANCE_CONTACT_ATTEMPT_CHANNELS,
                    "Insurance contact channel"
                ),

            intent:
                oneOf(
                    input.intent,
                    INSURANCE_CONTACT_ATTEMPT_INTENTS,
                    "Insurance contact intent"
                ),

            state:
                oneOf(
                    input.state,
                    INSURANCE_CONTACT_ATTEMPT_STATES,
                    "Insurance contact attempt state"
                ),

            idempotencyKey:
                createInsuranceContactIdempotencyKey(
                    input.idempotencyKey
                ),

            requestedAt:
                timestamp(
                    input.requestedAt,
                    "Requested at"
                ),

            createdAt:
                timestamp(
                    input.createdAt,
                    "Created at"
                ),

            updatedAt:
                timestamp(
                    input.updatedAt,
                    "Updated at"
                ),

            ...(triggerEventId !==
                undefined
                ? {
                    triggerEventId
                }
                : {}),

            ...(provider !==
                undefined
                ? {
                    provider
                }
                : {}),

            ...(providerReference !==
                undefined
                ? {
                    providerReference
                }
                : {}),

            ...(optionalTimestamp(
                input.attemptedAt,
                "Attempted at"
            ) !== undefined
                ? {
                    attemptedAt:
                        optionalTimestamp(
                            input.attemptedAt,
                            "Attempted at"
                        )!
                }
                : {}),

            ...(optionalTimestamp(
                input.connectedAt,
                "Connected at"
            ) !== undefined
                ? {
                    connectedAt:
                        optionalTimestamp(
                            input.connectedAt,
                            "Connected at"
                        )!
                }
                : {}),

            ...(optionalTimestamp(
                input.completedAt,
                "Completed at"
            ) !== undefined
                ? {
                    completedAt:
                        optionalTimestamp(
                            input.completedAt,
                            "Completed at"
                        )!
                }
                : {}),

            ...(optionalTimestamp(
                input.failedAt,
                "Failed at"
            ) !== undefined
                ? {
                    failedAt:
                        optionalTimestamp(
                            input.failedAt,
                            "Failed at"
                        )!
                }
                : {}),

            ...(optionalTimestamp(
                input.canceledAt,
                "Canceled at"
            ) !== undefined
                ? {
                    canceledAt:
                        optionalTimestamp(
                            input.canceledAt,
                            "Canceled at"
                        )!
                }
                : {}),

            ...(failureCode !==
                undefined
                ? {
                    failureCode
                }
                : {}),

            ...(failureMessage !==
                undefined
                ? {
                    failureMessage
                }
                : {}),

            ...(input.retryable !==
                undefined
                ? {
                    retryable:
                        input.retryable
                }
                : {})
        };

    validateStateFields(
        attempt
    );

    return attempt;
}

const ALLOWED_TRANSITIONS:
    Readonly<
        Record<
            InsuranceContactAttemptState,
            readonly InsuranceContactAttemptState[]
        >
    > = {
        queued: [
            "attempting",
            "canceled"
        ],

        attempting: [
            "connected",
            "completed",
            "failed",
            "canceled"
        ],

        connected: [
            "completed",
            "failed"
        ],

        completed: [],
        failed: [],
        canceled: []
    };

export function canTransitionInsuranceContactAttempt(
    from:
        InsuranceContactAttemptState,
    to:
        InsuranceContactAttemptState
):
    boolean {

    return ALLOWED_TRANSITIONS[
        from
    ].includes(
        to
    );
}

export function transitionInsuranceContactAttempt(
    attempt:
        InsuranceContactAttempt,
    to:
        InsuranceContactAttemptState,
    occurredAt:
        unknown,
    details?:
        {
            readonly provider?:
                unknown;

            readonly providerReference?:
                unknown;

            readonly failureCode?:
                unknown;

            readonly failureMessage?:
                unknown;

            readonly retryable?:
                unknown;
        }
):
    InsuranceContactAttempt {

    if(
        !canTransitionInsuranceContactAttempt(
            attempt.state,
            to
        )
    ){
        throw new Error(
            `Insurance contact attempt cannot transition from ${attempt.state} to ${to}.`
        );
    }

    const at =
        timestamp(
            occurredAt,
            "Transition timestamp"
        );

    const provider =
        details?.provider ===
            undefined
            ? attempt.provider
            : optionalText(
                details.provider,
                "Provider"
            );

    const providerReference =
        details?.providerReference ===
            undefined
            ? attempt.providerReference
            : optionalText(
                details.providerReference,
                "Provider reference"
            );

    const next:
        CreateInsuranceContactAttemptInput = {
            ...attempt,
            state:
                to,
            updatedAt:
                at,

            ...(provider !==
                undefined
                ? {
                    provider
                }
                : {}),

            ...(providerReference !==
                undefined
                ? {
                    providerReference
                }
                : {}),

            ...(to ===
                "attempting"
                ? {
                    attemptedAt:
                        at
                }
                : {}),

            ...(to ===
                "connected"
                ? {
                    attemptedAt:
                        attempt.attemptedAt ??
                        at,
                    connectedAt:
                        at
                }
                : {}),

            ...(to ===
                "completed"
                ? {
                    completedAt:
                        at
                }
                : {}),

            ...(to ===
                "failed"
                ? {
                    failedAt:
                        at,
                    failureCode:
                        requiredText(
                            details?.failureCode,
                            "Failure code"
                        ),
                    failureMessage:
                        requiredText(
                            details?.failureMessage,
                            "Failure message"
                        ),
                    retryable:
                        typeof details?.retryable ===
                            "boolean"
                            ? details.retryable
                            : (() => {
                                throw new Error(
                                    "Failed transition requires retryable."
                                );
                            })()
                }
                : {}),

            ...(to ===
                "canceled"
                ? {
                    canceledAt:
                        at
                }
                : {})
        };

    return createInsuranceContactAttempt(
        next
    );
}

export function evaluateInsuranceContactEligibility(
    context:
        InsuranceGrowthIntegrationContext,
    channel:
        InsuranceContactChannel
):
    InsuranceContactEligibility {

    if(
        context.doNotContact
    ){
        return {
            eligible:
                false,
            reason:
                "relationship-suppressed"
        };
    }

    const channelContext =
        context.contactChannels.find(
            candidate =>
                candidate.channel ===
                    channel
        );

    if(
        channelContext ===
            undefined
    ){
        return {
            eligible:
                false,
            reason:
                "channel-missing"
        };
    }

    if(
        channelContext.doNotContact
    ){
        return {
            eligible:
                false,
            reason:
                "channel-suppressed"
        };
    }

    if(
        channelContext.status !==
            "granted"
    ){
        return {
            eligible:
                false,
            reason:
                "consent-not-granted"
        };
    }

    return {
        eligible:
            true
    };
}

export function createInsuranceContactProviderResult(
    input:
        unknown
):
    InsuranceContactProviderResult {

    if(
        typeof input !==
            "object" ||
        input ===
            null
    ){
        throw new Error(
            "Provider result must be an object."
        );
    }

    const record =
        input as
            Record<
                string,
                unknown
            >;

    if(
        record.accepted ===
            true
    ){
        const providerReference =
            optionalText(
                record.providerReference,
                "Provider reference"
            );

        const providerState =
            optionalText(
                record.providerState,
                "Provider state"
            );

        return {
            accepted:
                true,

            ...(providerReference !==
                undefined
                ? {
                    providerReference
                }
                : {}),

            ...(providerState !==
                undefined
                ? {
                    providerState
                }
                : {})
        };
    }

    if(
        record.accepted ===
            false
    ){
        if(
            typeof record.retryable !==
                "boolean"
        ){
            throw new Error(
                "Provider failure retryable must be boolean."
            );
        }

        return {
            accepted:
                false,

            code:
                requiredText(
                    record.code,
                    "Provider failure code"
                ),

            message:
                requiredText(
                    record.message,
                    "Provider failure message"
                ),

            retryable:
                record.retryable
        };
    }

    throw new Error(
        "Provider result accepted must be boolean."
    );
}
