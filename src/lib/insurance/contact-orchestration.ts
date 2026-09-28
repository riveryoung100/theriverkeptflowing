import type {
    InsuranceGrowthIntegrationContext
} from "./integration-boundary";

import {
    createInsuranceContactAttempt,
    createInsuranceContactIdempotencyKey,
    createInsuranceContactProviderResult,
    evaluateInsuranceContactEligibility,
    transitionInsuranceContactAttempt
} from "./contact-attempt";

import type {
    InsuranceContactAttempt,
    InsuranceContactAttemptId,
    InsuranceContactChannel,
    InsuranceContactDestination,
    InsuranceContactIdempotencyKey,
    InsuranceContactIntent,
    InsuranceContactProvider
} from "./contact-attempt";

import type {
    InsuranceContactAttemptPersistence
} from "./d1-contact-attempt";

import type {
    D1RiverCrmGrowthPersistence
} from "../river-os/d1-crm-growth";

import type {
    RiverCrmPersistence
} from "../river-os/crm-workspace";

import type {
    RiverCrmContactConsent,
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";


export interface InsuranceContactOrchestrationRequest {
    readonly context:
        InsuranceGrowthIntegrationContext;

    readonly attemptId:
        InsuranceContactAttemptId | string;

    readonly channel:
        InsuranceContactChannel;

    readonly intent:
        InsuranceContactIntent;

    readonly idempotencyKey:
        InsuranceContactIdempotencyKey | string;

    readonly triggerEventId?:
        string;
}


export type InsuranceContactOrchestrationResult =
    | {
        readonly ok:
            true;

        readonly attempt:
            InsuranceContactAttempt;
      }
    | {
        readonly ok:
            false;

        readonly code:
            "relationship-not-found" |
            "destination-missing" |
            "contact-ineligible";

        readonly reason?:
            string;
      };


export interface InsuranceContactOrchestrationService {
    requestContact(
        request:
            InsuranceContactOrchestrationRequest
    ):
        Promise<
            InsuranceContactOrchestrationResult
        >;
}


export interface InsuranceContactOrchestrationDependencies {
    readonly relationships:
        Pick<
            RiverCrmPersistence,
            "get"
        >;

    readonly growth:
        Pick<
            D1RiverCrmGrowthPersistence,
            "listContactConsents"
        >;

    readonly attempts:
        InsuranceContactAttemptPersistence;

    readonly provider:
        InsuranceContactProvider;

    readonly providerName:
        string;

    readonly now:
        () => string;
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
        throw new TypeError(
            `${label} must be non-empty text.`
        );
    }

    return value.trim();
}


function requireTimestamp(
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
        throw new TypeError(
            `${label} must be a valid timestamp.`
        );
    }

    return text;
}


function resolveDestination(
    relationship:
        {
            readonly phone?:
                string;

            readonly email?:
                string;
        },
    channel:
        InsuranceContactChannel
):
    InsuranceContactDestination |
    undefined {

    const value =
        channel ===
            "email"
            ? relationship.email
            : relationship.phone;

    if(
        typeof value !==
            "string" ||
        value.trim().length ===
            0
    ){
        return undefined;
    }

    return {
        channel,
        value:
            value.trim()
    };
}


function latestConsentForChannel(
    consents:
        readonly RiverCrmContactConsent[],
    channel:
        InsuranceContactChannel
):
    RiverCrmContactConsent |
    undefined {

    return consents.find(
        consent =>
            consent.channel ===
                channel
    );
}


function contextWithCurrentChannelConsent(
    context:
        InsuranceGrowthIntegrationContext,
    consent:
        RiverCrmContactConsent |
        undefined
):
    InsuranceGrowthIntegrationContext {

    return {
        ...context,
        contactChannels:
            consent ===
                undefined
                ? []
                : [
                    {
                        channel:
                            consent.channel,
                        status:
                            consent.status,
                        doNotContact:
                            consent.doNotContact
                    }
                ]
    };
}


function sameRequestIdentity(
    attempt:
        InsuranceContactAttempt,
    request:
        {
            readonly relationshipId:
                RiverCrmRelationshipId;

            readonly channel:
                InsuranceContactChannel;

            readonly intent:
                InsuranceContactIntent;

            readonly idempotencyKey:
                InsuranceContactIdempotencyKey;
        }
):
    boolean {

    return (
        attempt.relationshipId ===
            request.relationshipId &&
        attempt.channel ===
            request.channel &&
        attempt.intent ===
            request.intent &&
        attempt.idempotencyKey ===
            request.idempotencyKey
    );
}


export function createInsuranceContactOrchestrationService(
    dependencies:
        InsuranceContactOrchestrationDependencies
):
    InsuranceContactOrchestrationService {

    const providerName =
        requiredText(
            dependencies.providerName,
            "Insurance contact provider name"
        );

    return {
        async requestContact(
            request
        ){

            const relationshipId =
                request.context.relationshipId;

            const idempotencyKey =
                createInsuranceContactIdempotencyKey(
                    request.idempotencyKey
                );

            const existing =
                await dependencies.attempts
                    .getAttemptByIdempotencyKey(
                        idempotencyKey
                    );

            if(
                existing !==
                    undefined
            ){
                if(
                    !sameRequestIdentity(
                        existing,
                        {
                            relationshipId,
                            channel:
                                request.channel,
                            intent:
                                request.intent,
                            idempotencyKey
                        }
                    )
                ){
                    throw new Error(
                        "Insurance contact idempotency key is already bound to a different request."
                    );
                }

                return {
                    ok:
                        true,
                    attempt:
                        existing
                };
            }

            const relationship =
                await dependencies.relationships
                    .get(
                        relationshipId
                    );

            if(
                relationship ===
                    undefined
            ){
                return {
                    ok:
                        false,
                    code:
                        "relationship-not-found"
                };
            }

            if(
                relationship.relationshipId !==
                    relationshipId
            ){
                throw new Error(
                    "Resolved CRM relationship identity does not match orchestration context."
                );
            }

            const destination =
                resolveDestination(
                    relationship,
                    request.channel
                );

            if(
                destination ===
                    undefined
            ){
                return {
                    ok:
                        false,
                    code:
                        "destination-missing"
                };
            }

            const consents =
                await dependencies.growth
                    .listContactConsents(
                        relationshipId
                    );

            const currentConsent =
                latestConsentForChannel(
                    consents,
                    request.channel
                );

            const eligibility =
                evaluateInsuranceContactEligibility(
                    contextWithCurrentChannelConsent(
                        request.context,
                        currentConsent
                    ),
                    request.channel
                );

            if(
                !eligibility.eligible
            ){
                return {
                    ok:
                        false,
                    code:
                        "contact-ineligible",
                    reason:
                        eligibility.reason
                };
            }

            const requestedAt =
                requireTimestamp(
                    dependencies.now(),
                    "Insurance contact request timestamp"
                );

            const queued =
                createInsuranceContactAttempt({
                    attemptId:
                        request.attemptId,
                    relationshipId,
                    channel:
                        request.channel,
                    intent:
                        request.intent,
                    state:
                        "queued",
                    idempotencyKey,
                    requestedAt,
                    createdAt:
                        requestedAt,
                    updatedAt:
                        requestedAt,
                    ...(request.triggerEventId !==
                        undefined
                        ? {
                            triggerEventId:
                                requiredText(
                                    request.triggerEventId,
                                    "Insurance contact trigger event ID"
                                )
                        }
                        : {})
                });

            await dependencies.attempts
                .insertAttempt(
                    queued
                );

            const attemptingAt =
                requireTimestamp(
                    dependencies.now(),
                    "Insurance contact attempt timestamp"
                );

            let attempting =
                transitionInsuranceContactAttempt(
                    queued,
                    "attempting",
                    attemptingAt,
                    {
                        provider:
                            providerName
                    }
                );

            await dependencies.attempts
                .updateAttempt(
                    attempting
                );

            let providerResult;

            try {
                providerResult =
                    createInsuranceContactProviderResult(
                        await dependencies.provider
                            .requestContact({
                                attemptId:
                                    attempting.attemptId,
                                relationshipId:
                                    attempting.relationshipId,
                                channel:
                                    attempting.channel,
                                intent:
                                    attempting.intent,
                                idempotencyKey:
                                    attempting.idempotencyKey,
                                destination
                            })
                    );
            }
            catch {
                const failedAt =
                    requireTimestamp(
                        dependencies.now(),
                        "Insurance contact provider failure timestamp"
                    );

                const failed =
                    transitionInsuranceContactAttempt(
                        attempting,
                        "failed",
                        failedAt,
                        {
                            provider:
                                providerName,
                            failureCode:
                                "provider-exception",
                            failureMessage:
                                "Contact provider request failed.",
                            retryable:
                                true
                        }
                    );

                await dependencies.attempts
                    .updateAttempt(
                        failed
                    );

                return {
                    ok:
                        true,
                    attempt:
                        failed
                };
            }

            if(
                !providerResult.accepted
            ){
                const failedAt =
                    requireTimestamp(
                        dependencies.now(),
                        "Insurance contact provider rejection timestamp"
                    );

                const failed =
                    transitionInsuranceContactAttempt(
                        attempting,
                        "failed",
                        failedAt,
                        {
                            provider:
                                providerName,
                            failureCode:
                                providerResult.code,
                            failureMessage:
                                providerResult.message,
                            retryable:
                                providerResult.retryable
                        }
                    );

                await dependencies.attempts
                    .updateAttempt(
                        failed
                    );

                return {
                    ok:
                        true,
                    attempt:
                        failed
                };
            }

            if(
                providerResult.providerReference !==
                    undefined
            ){
                attempting =
                    createInsuranceContactAttempt({
                        ...attempting,
                        providerReference:
                            providerResult.providerReference,
                        updatedAt:
                            requireTimestamp(
                                dependencies.now(),
                                "Insurance contact provider acceptance timestamp"
                            )
                    });

                await dependencies.attempts
                    .updateAttempt(
                        attempting
                    );
            }

            return {
                ok:
                    true,
                attempt:
                    attempting
            };
        }
    };
}
