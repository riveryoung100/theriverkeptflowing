import {
    canTransitionInsuranceContactAttempt,
    transitionInsuranceContactAttempt
} from "./contact-attempt";

import type {
    InsuranceContactAttempt
} from "./contact-attempt";

import type {
    ResolvedTelnyxCorrelatedEvent
} from "./telnyx-correlated-event";

import type {
    TelnyxAttemptReconciliationPlan,
    TelnyxAttemptReconciliationReason
} from "./telnyx-event-reconciliation";


function requireCorrelatedIdentity(
    correlated:
        ResolvedTelnyxCorrelatedEvent
):
    void {

    const {
        attempt,
        correlation,
        event,
        legRole
    } =
        correlated;

    if(attempt.provider !== "telnyx"){
        throw new Error(
            "Correlated Telnyx attempt reconciliation requires a Telnyx contact attempt."
        );
    }

    if(correlation.provider !== "telnyx"){
        throw new Error(
            "Correlated Telnyx attempt reconciliation requires a Telnyx call-leg correlation."
        );
    }

    if(
        attempt.attemptId !==
        correlation.attemptId
    ){
        throw new Error(
            "Correlated Telnyx attempt reconciliation requires matching canonical attempt identity."
        );
    }

    if(
        correlation.providerReference !==
        event.callControlId
    ){
        throw new Error(
            "Correlated Telnyx attempt reconciliation requires matching correlation providerReference and event callControlId."
        );
    }

    if(
        correlation.legRole !==
        legRole
    ){
        throw new Error(
            "Correlated Telnyx attempt reconciliation requires matching resolved leg role."
        );
    }
}


function noOp(
    attempt:
        InsuranceContactAttempt,
    reason:
        TelnyxAttemptReconciliationReason
):
    TelnyxAttemptReconciliationPlan {

    return {
        kind:
            "no-op",
        reason,
        attempt
    };
}


function update(
    previous:
        InsuranceContactAttempt,
    next:
        InsuranceContactAttempt,
    reason:
        TelnyxAttemptReconciliationReason
):
    TelnyxAttemptReconciliationPlan {

    return {
        kind:
            "update",
        reason,
        previous,
        next
    };
}


export function planTelnyxCorrelatedAttemptEventReconciliation(
    correlated:
        ResolvedTelnyxCorrelatedEvent
):
    TelnyxAttemptReconciliationPlan {

    requireCorrelatedIdentity(
        correlated
    );

    const attempt =
        correlated.attempt;

    const event =
        correlated.event;

    switch(event.type){
        case "call.initiated":
            return noOp(
                attempt,
                "initiated-observed"
            );

        case "call.answered":
            return noOp(
                attempt,
                "answered-observed"
            );

        case "call.bridged": {
            if(
                attempt.state !==
                    "attempting"
            ){
                return noOp(
                    attempt,
                    "bridged-already-advanced"
                );
            }

            if(
                !canTransitionInsuranceContactAttempt(
                    attempt.state,
                    "connected"
                )
            ){
                return noOp(
                    attempt,
                    "bridged-already-advanced"
                );
            }

            return update(
                attempt,
                transitionInsuranceContactAttempt(
                    attempt,
                    "connected",
                    event.occurredAt
                ),
                "bridged-connected"
            );
        }

        case "call.hangup": {
            if(
                attempt.state !==
                    "attempting" &&
                attempt.state !==
                    "connected"
            ){
                return noOp(
                    attempt,
                    "hangup-already-terminal"
                );
            }

            if(
                !canTransitionInsuranceContactAttempt(
                    attempt.state,
                    "completed"
                )
            ){
                return noOp(
                    attempt,
                    "hangup-already-terminal"
                );
            }

            return update(
                attempt,
                transitionInsuranceContactAttempt(
                    attempt,
                    "completed",
                    event.occurredAt
                ),
                "hangup-completed"
            );
        }
    }
}
