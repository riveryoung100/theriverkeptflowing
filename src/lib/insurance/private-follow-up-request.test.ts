import assert from "node:assert/strict";
import test from "node:test";

import {
    buildInsurancePrivateFollowUpRequestFromForm
} from "./private-follow-up-request";


function form(
    entries:
        Record<
            string,
            string
        >
):
    FormData {

    const formData =
        new FormData();

    for(
        const [
            key,
            value
        ] of Object.entries(
            entries
        )
    ){
        formData.set(
            key,
            value
        );
    }

    return formData;
}


test(
    "private follow-up request parses explicit schedule operation with absolute timestamp",
    () => {
        const request =
            buildInsurancePrivateFollowUpRequestFromForm(
                form({
                    relationshipId:
                        "relationship:follow-up-route-1",

                    operation:
                        "schedule",

                    nextFollowUpAt:
                        "2026-10-02T09:30:00-05:00"
                })
            );

        assert.deepEqual(
            request,
            {
                relationshipId:
                    "relationship:follow-up-route-1",

                operation:
                    "schedule",

                nextFollowUpAt:
                    "2026-10-02T09:30:00-05:00"
            }
        );
    }
);


test(
    "private follow-up request trims normalized transport text",
    () => {
        const request =
            buildInsurancePrivateFollowUpRequestFromForm(
                form({
                    relationshipId:
                        " relationship:follow-up-route-1 ",

                    operation:
                        " schedule ",

                    nextFollowUpAt:
                        " 2026-10-02T14:30:00Z "
                })
            );

        assert.equal(
            request.relationshipId,
            "relationship:follow-up-route-1"
        );

        assert.equal(
            request.operation,
            "schedule"
        );

        assert.equal(
            request.nextFollowUpAt,
            "2026-10-02T14:30:00Z"
        );
    }
);


test(
    "private follow-up clear operation maps explicitly to null even if a stale form timestamp is present",
    () => {
        const request =
            buildInsurancePrivateFollowUpRequestFromForm(
                form({
                    relationshipId:
                        "relationship:follow-up-route-1",

                    operation:
                        "clear",

                    nextFollowUpAt:
                        "2026-10-02T14:30:00Z"
                })
            );

        assert.deepEqual(
            request,
            {
                relationshipId:
                    "relationship:follow-up-route-1",

                operation:
                    "clear",

                nextFollowUpAt:
                    null
            }
        );
    }
);


test(
    "private follow-up request rejects unsupported operation",
    () => {
        assert.throws(
            () =>
                buildInsurancePrivateFollowUpRequestFromForm(
                    form({
                        relationshipId:
                            "relationship:follow-up-route-1",

                        operation:
                            "snooze"
                    })
                ),
            /operation is not supported/
        );
    }
);


test(
    "private follow-up schedule requires nextFollowUpAt",
    () => {
        assert.throws(
            () =>
                buildInsurancePrivateFollowUpRequestFromForm(
                    form({
                        relationshipId:
                            "relationship:follow-up-route-1",

                        operation:
                            "schedule"
                    })
                ),
            /requires nextFollowUpAt/
        );
    }
);


test(
    "private follow-up schedule rejects timezone-ambiguous local timestamp",
    () => {
        assert.throws(
            () =>
                buildInsurancePrivateFollowUpRequestFromForm(
                    form({
                        relationshipId:
                            "relationship:follow-up-route-1",

                        operation:
                            "schedule",

                        nextFollowUpAt:
                            "2026-10-02T09:30:00"
                    })
                ),
            /absolute timestamp/
        );
    }
);


test(
    "private follow-up schedule rejects invalid absolute timestamp",
    () => {
        assert.throws(
            () =>
                buildInsurancePrivateFollowUpRequestFromForm(
                    form({
                        relationshipId:
                            "relationship:follow-up-route-1",

                        operation:
                            "schedule",

                        nextFollowUpAt:
                            "not-a-dateZ"
                    })
                ),
            /absolute timestamp/
        );
    }
);


test(
    "private follow-up request reuses canonical River CRM relationship identity validation",
    () => {
        assert.throws(
            () =>
                buildInsurancePrivateFollowUpRequestFromForm(
                    form({
                        relationshipId:
                            "follow-up-route-1",

                        operation:
                            "clear"
                    })
                ),
            /relationship identity/
        );
    }
);
