import assert from "node:assert/strict";
import test from "node:test";

import {
    buildInsurancePrivateOperatingStateRequestFromForm
} from "./private-operating-state-request";


function form(
    values:
        Readonly<
            Record<
                string,
                string
            >
        >
):
    FormData {

    const data =
        new FormData();

    for(
        const [
            key,
            value
        ] of Object.entries(
            values
        )
    ){
        data.set(
            key,
            value
        );
    }

    return data;
}


test(
    "private operating-state request normalizes complete manual target state",
    () => {
        const request =
            buildInsurancePrivateOperatingStateRequestFromForm(
                form({
                    relationshipId:
                        "relationship:insurance-operating-1",

                    stage:
                        " qualified ",

                    quoteStatus:
                        " in-progress ",

                    assignedProducer:
                        " River "
                })
            );

        assert.deepEqual(
            request,
            {
                relationshipId:
                    "relationship:insurance-operating-1",

                stage:
                    "qualified",

                quoteStatus:
                    "in-progress",

                assignedProducer:
                    "River"
            }
        );
    }
);


test(
    "private operating-state request treats blank producer assignment as explicit unassignment",
    () => {
        const request =
            buildInsurancePrivateOperatingStateRequestFromForm(
                form({
                    relationshipId:
                        "relationship:insurance-operating-2",

                    stage:
                        "contacted",

                    quoteStatus:
                        "requested",

                    assignedProducer:
                        "   "
                })
            );

        assert.equal(
            request.assignedProducer,
            null
        );
    }
);


test(
    "private operating-state request treats omitted producer assignment as explicit unassignment",
    () => {
        const request =
            buildInsurancePrivateOperatingStateRequestFromForm(
                form({
                    relationshipId:
                        "relationship:insurance-operating-3",

                    stage:
                        "new",

                    quoteStatus:
                        "requested"
                })
            );

        assert.equal(
            request.assignedProducer,
            null
        );
    }
);


test(
    "private operating-state request rejects missing relationship identity",
    () => {
        assert.throws(
            () =>
                buildInsurancePrivateOperatingStateRequestFromForm(
                    form({
                        stage:
                            "new",

                        quoteStatus:
                            "requested"
                    })
                ),
            /relationship identity/
        );
    }
);


test(
    "private operating-state request rejects missing stage",
    () => {
        assert.throws(
            () =>
                buildInsurancePrivateOperatingStateRequestFromForm(
                    form({
                        relationshipId:
                            "relationship:insurance-operating-4",

                        quoteStatus:
                            "requested"
                    })
                ),
            /requires stage/
        );
    }
);


test(
    "private operating-state request rejects missing quote status",
    () => {
        assert.throws(
            () =>
                buildInsurancePrivateOperatingStateRequestFromForm(
                    form({
                        relationshipId:
                            "relationship:insurance-operating-5",

                        stage:
                            "new"
                    })
                ),
            /requires quoteStatus/
        );
    }
);
