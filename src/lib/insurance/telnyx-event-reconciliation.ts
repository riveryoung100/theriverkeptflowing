import {
    canTransitionInsuranceContactAttempt,
    transitionInsuranceContactAttempt,
    type InsuranceContactAttempt
} from "./contact-attempt";

import type {
    TelnyxVoiceEvent
} from "./telnyx-voice-event";


export type TelnyxAttemptReconciliationReason =
    | "initiated-observed"
    | "answered-observed"
    | "bridged-connected"
    | "bridged-already-advanced"
    | "hangup-completed"
    | "hangup-already-terminal";


export type TelnyxAttemptReconciliationPlan =
    | {
        readonly kind:
            "no-op";

        readonly reason:
            TelnyxAttemptReconciliationReason;

        readonly attempt:
            InsuranceContactAttempt;
    }
    | {
        readonly kind:
            "update";

        readonly reason:
            TelnyxAttemptReconciliationReason;

        readonly previous:
            InsuranceContactAttempt;

        readonly next:
            InsuranceContactAttempt;
    };


function requireMatchingProviderIdentity(
    attempt:
        InsuranceContactAttempt,
    event:
        TelnyxVoiceEvent
):
    void {

    if(
        attempt.provider !==
            "telnyx"
    ){
        throw new Error(
            "Telnyx event reconciliation requires a Telnyx contact attempt."
        );
    }

    if(
        attempt.providerReference !==
            event.callControlId
    ){
        throw new Error(
            "Telnyx event reconciliation requires matching providerReference and callControlId."
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


export function planTelnyxAttemptEventReconciliation(
    attempt:
        InsuranceContactAttempt,
    event:
        TelnyxVoiceEvent
):
    TelnyxAttemptReconciliationPlan {

    requireMatchingProviderIdentity(
        attempt,
        event
    );

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
