import assert from "node:assert/strict";
import test from "node:test";

import {
    createInsuranceContactAttemptId
} from "./contact-attempt";

import {
    createTelnyxCallLegCorrelation
} from "./telnyx-call-correlation";


const attemptId =
    createInsuranceContactAttemptId(
        "contact-attempt:correlation-1"
    );


test(
    "creates canonical operator correlation",
    () => {
        const value =
            createTelnyxCallLegCorrelation({
                attemptId,
                legRole:
                    "operator",
                providerReference:
                    " call-control-operator ",
                createdAt:
                    "2026-09-28T20:00:00.000Z"
            });

        assert.deepEqual(
            value,
            {
                attemptId,
                legRole:
                    "operator",
                provider:
                    "telnyx",
                providerReference:
                    "call-control-operator",
                createdAt:
                    "2026-09-28T20:00:00.000Z",
                updatedAt:
                    "2026-09-28T20:00:00.000Z"
            }
        );
    }
);


test(
    "creates canonical lead correlation with explicit updatedAt",
    () => {
        const value =
            createTelnyxCallLegCorrelation({
                attemptId,
                legRole:
                    "lead",
                providerReference:
                    "call-control-lead",
                createdAt:
                    "2026-09-28T20:00:00.000Z",
                updatedAt:
                    "2026-09-28T20:00:01.000Z"
            });

        assert.equal(
            value.legRole,
            "lead"
        );

        assert.equal(
            value.updatedAt,
            "2026-09-28T20:00:01.000Z"
        );
    }
);


test(
    "rejects blank provider reference",
    () => {
        assert.throws(
            () =>
                createTelnyxCallLegCorrelation({
                    attemptId,
                    legRole:
                        "operator",
                    providerReference:
                        " ",
                    createdAt:
                        "2026-09-28T20:00:00.000Z"
                }),
            /providerReference/
        );
    }
);


test(
    "rejects invalid timestamp",
    () => {
        assert.throws(
            () =>
                createTelnyxCallLegCorrelation({
                    attemptId,
                    legRole:
                        "lead",
                    providerReference:
                        "call-control-lead",
                    createdAt:
                        "invalid"
                }),
            /valid timestamp/
        );
    }
);


test(
    "rejects unsupported leg role at runtime",
    () => {
        assert.throws(
            () =>
                createTelnyxCallLegCorrelation({
                    attemptId,
                    legRole:
                        "observer" as "operator",
                    providerReference:
                        "call-control",
                    createdAt:
                        "2026-09-28T20:00:00.000Z"
                }),
            /operator or lead/
        );
    }
);
