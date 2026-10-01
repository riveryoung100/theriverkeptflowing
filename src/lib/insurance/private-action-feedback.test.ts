import assert from "node:assert/strict";
import test from "node:test";

import {
    resolveInsurancePrivateActionFeedback
} from "./private-action-feedback";


function feedback(
    query:
        string
) {
    return resolveInsurancePrivateActionFeedback(
        new URLSearchParams(
            query
        )
    );
}


test(
    "maps canonical operating-state outcomes only",
    () => {
        assert.deepEqual(
            feedback(
                "operatingState=updated"
            ),
            {
                kind:
                    "operating-state",
                outcome:
                    "updated",
                message:
                    "Insurance operating state updated."
            }
        );

        assert.equal(
            feedback(
                "operatingState=unexpected"
            ),
            undefined
        );
    }
);


test(
    "maps canonical appointment outcomes",
    () => {
        const cases =
            [
                [
                    "scheduled",
                    "Appointment scheduled."
                ],
                [
                    "rescheduled",
                    "Appointment rescheduled."
                ],
                [
                    "cleared",
                    "Appointment cleared."
                ],
                [
                    "no-op",
                    "Appointment already matched the requested value."
                ]
            ] as const;

        for(const [
            outcome,
            message
        ] of cases){
            assert.deepEqual(
                feedback(
                    `appointment=${outcome}`
                ),
                {
                    kind:
                        "appointment",
                    outcome,
                    message
                }
            );
        }
    }
);


test(
    "maps canonical follow-up outcomes",
    () => {
        const cases =
            [
                [
                    "scheduled",
                    "Follow-up scheduled."
                ],
                [
                    "cleared",
                    "Follow-up cleared."
                ],
                [
                    "no-op",
                    "Follow-up already matched the requested value."
                ]
            ] as const;

        for(const [
            outcome,
            message
        ] of cases){
            assert.deepEqual(
                feedback(
                    `followUp=${outcome}`
                ),
                {
                    kind:
                        "follow-up",
                    outcome,
                    message
                }
            );
        }
    }
);


test(
    "ignores absent empty or unknown private-action outcomes",
    () => {
        assert.equal(
            feedback(
                ""
            ),
            undefined
        );

        assert.equal(
            feedback(
                "appointment="
            ),
            undefined
        );

        assert.equal(
            feedback(
                "appointment=anything"
            ),
            undefined
        );
    }
);


test(
    "does not treat insurance queue selection as action feedback",
    () => {
        assert.equal(
            feedback(
                "insuranceQueue=requested"
            ),
            undefined
        );
    }
);
