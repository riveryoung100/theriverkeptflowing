import assert from "node:assert/strict";
import test from "node:test";

import {
    buildInsurancePrivateCrmActionRedirect,
    buildInsurancePrivateCrmViewContextFromForm
} from "./private-crm-view-context";

function form(
    values:
        Readonly<Record<string, string>>
):
    FormData {

    const data =
        new FormData();

    for (
        const [
            key,
            value
        ] of Object.entries(
            values
        )
    ) {
        data.set(
            key,
            value
        );
    }

    return data;
}

test(
    "private CRM view context preserves only canonical queue and bounded search",
    () => {
        const context =
            buildInsurancePrivateCrmViewContextFromForm(
                form({
                    insuranceQueue:
                        " stage-qualified ",

                    search:
                        " River Young "
                })
            );

        assert.deepEqual(
            context,
            {
                insuranceQueue:
                    "stage-qualified",

                search:
                    "River Young"
            }
        );
    }
);

test(
    "private CRM view context omits all queue blank search and invalid queue",
    () => {
        assert.deepEqual(
            buildInsurancePrivateCrmViewContextFromForm(
                form({
                    insuranceQueue:
                        "all",

                    search:
                        "   "
                })
            ),
            {}
        );

        assert.deepEqual(
            buildInsurancePrivateCrmViewContextFromForm(
                form({
                    insuranceQueue:
                        "not-a-real-queue",

                    search:
                        "x".repeat(
                            250
                        )
                })
            ),
            {
                search:
                    "x".repeat(
                        200
                    )
            }
        );
    }
);

test(
    "private CRM action redirect reconstructs canonical context and feedback",
    () => {
        assert.equal(
            buildInsurancePrivateCrmActionRedirect(
                "appointment",
                "scheduled",
                {
                    insuranceQueue:
                        "stage-qualified",

                    search:
                        "River Young"
                }
            ),
            "/river-os/crm?insuranceQueue=stage-qualified&search=River+Young&appointment=scheduled"
        );

        assert.equal(
            buildInsurancePrivateCrmActionRedirect(
                "followUp",
                "cleared",
                {}
            ),
            "/river-os/crm?followUp=cleared"
        );
    }
);
