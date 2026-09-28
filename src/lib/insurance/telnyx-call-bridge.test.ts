import assert from "node:assert/strict";
import test from "node:test";

import {
    createTelnyxCallBridge,
    transitionTelnyxCallBridge
} from "./telnyx-call-bridge";

import type {
    InsuranceContactAttemptId
} from "./contact-attempt";


const attemptId =
    "contact-attempt:test-bridge" as
        InsuranceContactAttemptId;


test(
    "creates operator-first bridge lifecycle",
    () => {
        const bridge =
            createTelnyxCallBridge({
                attemptId,
                createdAt:
                    "2026-09-28T19:00:00.000Z"
            });

        assert.deepEqual(
            bridge,
            {
                attemptId,
                state:
                    "operator-dial-requested",
                createdAt:
                    "2026-09-28T19:00:00.000Z",
                updatedAt:
                    "2026-09-28T19:00:00.000Z"
            }
        );
    }
);


test(
    "supports complete operator-first lifecycle",
    () => {
        const created =
            createTelnyxCallBridge({
                attemptId,
                createdAt:
                    "2026-09-28T19:00:00.000Z"
            });

        const operatorAnswered =
            transitionTelnyxCallBridge(
                created,
                "operator-answered",
                "2026-09-28T19:00:01.000Z",
                {
                    operatorCallControlId:
                        "operator-call-1"
                }
            );

        const leadDial =
            transitionTelnyxCallBridge(
                operatorAnswered,
                "lead-dial-requested",
                "2026-09-28T19:00:02.000Z"
            );

        const leadAnswered =
            transitionTelnyxCallBridge(
                leadDial,
                "lead-answered",
                "2026-09-28T19:00:03.000Z",
                {
                    leadCallControlId:
                        "lead-call-1"
                }
            );

        const bridgeRequested =
            transitionTelnyxCallBridge(
                leadAnswered,
                "bridge-requested",
                "2026-09-28T19:00:04.000Z"
            );

        const bridged =
            transitionTelnyxCallBridge(
                bridgeRequested,
                "bridged",
                "2026-09-28T19:00:05.000Z"
            );

        const completed =
            transitionTelnyxCallBridge(
                bridged,
                "completed",
                "2026-09-28T19:05:00.000Z"
            );

        assert.equal(
            completed.state,
            "completed"
        );

        assert.equal(
            completed.operatorCallControlId,
            "operator-call-1"
        );

        assert.equal(
            completed.leadCallControlId,
            "lead-call-1"
        );
    }
);


test(
    "lead cannot begin before operator answers",
    () => {
        const bridge =
            createTelnyxCallBridge({
                attemptId,
                createdAt:
                    "2026-09-28T19:00:00.000Z"
            });

        assert.throws(
            () =>
                transitionTelnyxCallBridge(
                    bridge,
                    "lead-dial-requested",
                    "2026-09-28T19:00:01.000Z"
                ),
            /Illegal Telnyx call bridge transition/
        );
    }
);


test(
    "bridge cannot begin before lead answers",
    () => {
        const created =
            createTelnyxCallBridge({
                attemptId,
                createdAt:
                    "2026-09-28T19:00:00.000Z"
            });

        const operatorAnswered =
            transitionTelnyxCallBridge(
                created,
                "operator-answered",
                "2026-09-28T19:00:01.000Z",
                {
                    operatorCallControlId:
                        "operator-call-1"
                }
            );

        const leadDial =
            transitionTelnyxCallBridge(
                operatorAnswered,
                "lead-dial-requested",
                "2026-09-28T19:00:02.000Z"
            );

        assert.throws(
            () =>
                transitionTelnyxCallBridge(
                    leadDial,
                    "bridge-requested",
                    "2026-09-28T19:00:03.000Z"
                ),
            /Illegal Telnyx call bridge transition/
        );
    }
);


test(
    "operator answered requires operator call identity",
    () => {
        const bridge =
            createTelnyxCallBridge({
                attemptId,
                createdAt:
                    "2026-09-28T19:00:00.000Z"
            });

        assert.throws(
            () =>
                transitionTelnyxCallBridge(
                    bridge,
                    "operator-answered",
                    "2026-09-28T19:00:01.000Z"
                ),
            /requires operatorCallControlId/
        );
    }
);


test(
    "lead answered requires lead call identity",
    () => {
        const created =
            createTelnyxCallBridge({
                attemptId,
                createdAt:
                    "2026-09-28T19:00:00.000Z"
            });

        const operatorAnswered =
            transitionTelnyxCallBridge(
                created,
                "operator-answered",
                "2026-09-28T19:00:01.000Z",
                {
                    operatorCallControlId:
                        "operator-call-1"
                }
            );

        const leadDial =
            transitionTelnyxCallBridge(
                operatorAnswered,
                "lead-dial-requested",
                "2026-09-28T19:00:02.000Z"
            );

        assert.throws(
            () =>
                transitionTelnyxCallBridge(
                    leadDial,
                    "lead-answered",
                    "2026-09-28T19:00:03.000Z"
                ),
            /requires leadCallControlId/
        );
    }
);


test(
    "any active state can fail with a canonical failure code",
    () => {
        const bridge =
            createTelnyxCallBridge({
                attemptId,
                createdAt:
                    "2026-09-28T19:00:00.000Z"
            });

        const failed =
            transitionTelnyxCallBridge(
                bridge,
                "failed",
                "2026-09-28T19:00:01.000Z",
                {
                    failureCode:
                        "operator-no-answer"
                }
            );

        assert.equal(
            failed.state,
            "failed"
        );

        assert.equal(
            failed.failureCode,
            "operator-no-answer"
        );
    }
);


test(
    "failed state requires failure code",
    () => {
        const bridge =
            createTelnyxCallBridge({
                attemptId,
                createdAt:
                    "2026-09-28T19:00:00.000Z"
            });

        assert.throws(
            () =>
                transitionTelnyxCallBridge(
                    bridge,
                    "failed",
                    "2026-09-28T19:00:01.000Z"
                ),
            /requires failureCode/
        );
    }
);


test(
    "terminal bridge states cannot transition",
    () => {
        const created =
            createTelnyxCallBridge({
                attemptId,
                createdAt:
                    "2026-09-28T19:00:00.000Z"
            });

        const failed =
            transitionTelnyxCallBridge(
                created,
                "failed",
                "2026-09-28T19:00:01.000Z",
                {
                    failureCode:
                        "operator-no-answer"
                }
            );

        assert.throws(
            () =>
                transitionTelnyxCallBridge(
                    failed,
                    "completed",
                    "2026-09-28T19:00:02.000Z"
                ),
            /Terminal Telnyx call bridge/
        );
    }
);


test(
    "rejects invalid timestamps",
    () => {
        assert.throws(
            () =>
                createTelnyxCallBridge({
                    attemptId,
                    createdAt:
                        "not-a-date"
                }),
            /valid timestamp/
        );
    }
);
