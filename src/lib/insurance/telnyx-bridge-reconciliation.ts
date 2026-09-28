import {
    transitionTelnyxCallBridge
} from "./telnyx-call-bridge";

import type {
    TelnyxCallBridge,
    TelnyxCallBridgeState
} from "./telnyx-call-bridge";

import type {
    ResolvedTelnyxCorrelatedEvent
} from "./telnyx-correlated-event";


export type TelnyxBridgeReconciliationReason =
    | "initiated-observed"
    | "operator-answered"
    | "operator-answer-already-observed"
    | "lead-answered"
    | "lead-answer-already-observed"
    | "lead-answer-before-operator"
    | "bridged"
    | "bridge-already-observed"
    | "bridge-prerequisites-missing"
    | "hangup-completed"
    | "hangup-failed-before-bridge"
    | "hangup-already-terminal";


export type TelnyxBridgeReconciliationPlan =
    | {
        readonly kind:
            "no-op";

        readonly reason:
            TelnyxBridgeReconciliationReason;

        readonly bridge:
            TelnyxCallBridge;
    }
    | {
        readonly kind:
            "update";

        readonly reason:
            TelnyxBridgeReconciliationReason;

        readonly previous:
            TelnyxCallBridge;

        readonly next:
            TelnyxCallBridge;
    }
    | {
        readonly kind:
            "defer";

        readonly reason:
            TelnyxBridgeReconciliationReason;

        readonly bridge:
            TelnyxCallBridge;

        readonly retryable:
            true;
    };


const STATE_RANK:
    Readonly<
        Record<
            Exclude<
                TelnyxCallBridgeState,
                "failed"
            >,
            number
        >
    > = {
        "operator-dial-requested":
            0,
        "operator-answered":
            1,
        "lead-dial-requested":
            2,
        "lead-answered":
            3,
        "bridge-requested":
            4,
        "bridged":
            5,
        "completed":
            6
    };


function noOp(
    bridge:
        TelnyxCallBridge,
    reason:
        TelnyxBridgeReconciliationReason
):
    TelnyxBridgeReconciliationPlan {

    return {
        kind:
            "no-op",
        reason,
        bridge
    };
}


function defer(
    bridge:
        TelnyxCallBridge,
    reason:
        TelnyxBridgeReconciliationReason
):
    TelnyxBridgeReconciliationPlan {

    return {
        kind:
            "defer",
        reason,
        bridge,
        retryable:
            true
    };
}


function update(
    previous:
        TelnyxCallBridge,
    next:
        TelnyxCallBridge,
    reason:
        TelnyxBridgeReconciliationReason
):
    TelnyxBridgeReconciliationPlan {

    return {
        kind:
            "update",
        reason,
        previous,
        next
    };
}


function requireMatchingAttemptIdentity(
    bridge:
        TelnyxCallBridge,
    correlated:
        ResolvedTelnyxCorrelatedEvent
):
    void {

    if(
        bridge.attemptId !==
        correlated.attempt.attemptId ||
        bridge.attemptId !==
        correlated.correlation.attemptId
    ){
        throw new Error(
            "Telnyx bridge reconciliation requires matching canonical attempt identity."
        );
    }
}


function requireMatchingLegIdentity(
    correlated:
        ResolvedTelnyxCorrelatedEvent
):
    void {

    if(
        correlated.correlation.providerReference !==
        correlated.event.callControlId
    ){
        throw new Error(
            "Telnyx bridge reconciliation requires matching correlated call-control identity."
        );
    }

    if(
        correlated.correlation.legRole !==
        correlated.legRole
    ){
        throw new Error(
            "Telnyx bridge reconciliation requires matching correlated leg role."
        );
    }
}


function isTerminal(
    bridge:
        TelnyxCallBridge
):
    boolean {

    return (
        bridge.state ===
            "completed" ||
        bridge.state ===
            "failed"
    );
}


function rankAtLeast(
    bridge:
        TelnyxCallBridge,
    target:
        Exclude<
            TelnyxCallBridgeState,
            "failed"
        >
):
    boolean {

    if(bridge.state === "failed"){
        return true;
    }

    return (
        STATE_RANK[
            bridge.state
        ] >=
        STATE_RANK[
            target
        ]
    );
}


function operatorAnswered(
    bridge:
        TelnyxCallBridge,
    correlated:
        ResolvedTelnyxCorrelatedEvent
):
    TelnyxBridgeReconciliationPlan {

    if(
        isTerminal(
            bridge
        ) ||
        rankAtLeast(
            bridge,
            "operator-answered"
        )
    ){
        return noOp(
            bridge,
            "operator-answer-already-observed"
        );
    }

    return update(
        bridge,
        transitionTelnyxCallBridge(
            bridge,
            "operator-answered",
            correlated.event.occurredAt,
            {
                operatorCallControlId:
                    correlated.event.callControlId
            }
        ),
        "operator-answered"
    );
}


function leadAnswered(
    bridge:
        TelnyxCallBridge,
    correlated:
        ResolvedTelnyxCorrelatedEvent
):
    TelnyxBridgeReconciliationPlan {

    if(
        isTerminal(
            bridge
        ) ||
        rankAtLeast(
            bridge,
            "lead-answered"
        )
    ){
        return noOp(
            bridge,
            "lead-answer-already-observed"
        );
    }

    if(
        bridge.state ===
            "operator-dial-requested"
    ){
        return defer(
            bridge,
            "lead-answer-before-operator"
        );
    }

    let next =
        bridge;

    if(
        next.state ===
            "operator-answered"
    ){
        next =
            transitionTelnyxCallBridge(
                next,
                "lead-dial-requested",
                correlated.event.occurredAt
            );
    }

    if(
        next.state !==
            "lead-dial-requested"
    ){
        return defer(
            bridge,
            "lead-answer-before-operator"
        );
    }

    next =
        transitionTelnyxCallBridge(
            next,
            "lead-answered",
            correlated.event.occurredAt,
            {
                leadCallControlId:
                    correlated.event.callControlId
            }
        );

    return update(
        bridge,
        next,
        "lead-answered"
    );
}


function bridged(
    bridge:
        TelnyxCallBridge,
    correlated:
        ResolvedTelnyxCorrelatedEvent
):
    TelnyxBridgeReconciliationPlan {

    if(
        isTerminal(
            bridge
        ) ||
        rankAtLeast(
            bridge,
            "bridged"
        )
    ){
        return noOp(
            bridge,
            "bridge-already-observed"
        );
    }

    if(
        bridge.state !==
            "lead-answered" &&
        bridge.state !==
            "bridge-requested"
    ){
        return defer(
            bridge,
            "bridge-prerequisites-missing"
        );
    }

    let next =
        bridge;

    if(
        next.state ===
            "lead-answered"
    ){
        next =
            transitionTelnyxCallBridge(
                next,
                "bridge-requested",
                correlated.event.occurredAt
            );
    }

    next =
        transitionTelnyxCallBridge(
            next,
            "bridged",
            correlated.event.occurredAt
        );

    return update(
        bridge,
        next,
        "bridged"
    );
}


function hangup(
    bridge:
        TelnyxCallBridge,
    correlated:
        ResolvedTelnyxCorrelatedEvent
):
    TelnyxBridgeReconciliationPlan {

    if(isTerminal(bridge)){
        return noOp(
            bridge,
            "hangup-already-terminal"
        );
    }

    if(
        bridge.state ===
            "bridged"
    ){
        return update(
            bridge,
            transitionTelnyxCallBridge(
                bridge,
                "completed",
                correlated.event.occurredAt
            ),
            "hangup-completed"
        );
    }

    return update(
        bridge,
        transitionTelnyxCallBridge(
            bridge,
            "failed",
            correlated.event.occurredAt,
            {
                failureCode:
                    `${correlated.legRole}-hangup-before-bridge`
            }
        ),
        "hangup-failed-before-bridge"
    );
}


export function planTelnyxCorrelatedBridgeReconciliation(
    bridge:
        TelnyxCallBridge,
    correlated:
        ResolvedTelnyxCorrelatedEvent
):
    TelnyxBridgeReconciliationPlan {

    requireMatchingAttemptIdentity(
        bridge,
        correlated
    );

    requireMatchingLegIdentity(
        correlated
    );

    switch(correlated.event.type){
        case "call.initiated":
            return noOp(
                bridge,
                "initiated-observed"
            );

        case "call.answered":
            return correlated.legRole ===
                "operator"
                ? operatorAnswered(
                    bridge,
                    correlated
                )
                : leadAnswered(
                    bridge,
                    correlated
                );

        case "call.bridged":
            return bridged(
                bridge,
                correlated
            );

        case "call.hangup":
            return hangup(
                bridge,
                correlated
            );
    }
}
