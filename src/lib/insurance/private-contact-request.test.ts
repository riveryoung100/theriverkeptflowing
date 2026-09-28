import assert from "node:assert/strict";
import test from "node:test";

import {
    buildInsurancePrivateContactRequestFromForm
} from "./private-contact-request";


function form(
    values:
        Record<
            string,
            string
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
    "builds a canonical private callback request",
    () => {
        const request =
            buildInsurancePrivateContactRequestFromForm(
                form({
                    relationshipId:
                        "relationship:lead-1",
                    channel:
                        "phone",
                    intent:
                        "callback"
                })
            );

        assert.deepEqual(
            request,
            {
                relationshipId:
                    "relationship:lead-1",
                channel:
                    "phone",
                intent:
                    "callback"
            }
        );
    }
);


test(
    "supports instant contact and all canonical channels",
    () => {
        for(
            const channel of [
                "phone",
                "sms",
                "email"
            ]
        ){
            const request =
                buildInsurancePrivateContactRequestFromForm(
                    form({
                        relationshipId:
                            "relationship:lead-2",
                        channel,
                        intent:
                            "instant-contact"
                    })
                );

            assert.equal(
                request.channel,
                channel
            );

            assert.equal(
                request.intent,
                "instant-contact"
            );
        }
    }
);


test(
    "rejects malformed relationship identity",
    () => {
        assert.throws(
            () =>
                buildInsurancePrivateContactRequestFromForm(
                    form({
                        relationshipId:
                            "lead-1",
                        channel:
                            "phone",
                        intent:
                            "callback"
                    })
                ),
            /valid relationship identity/
        );
    }
);


test(
    "rejects unsupported channel",
    () => {
        assert.throws(
            () =>
                buildInsurancePrivateContactRequestFromForm(
                    form({
                        relationshipId:
                            "relationship:lead-1",
                        channel:
                            "carrier-pigeon",
                        intent:
                            "callback"
                    })
                ),
            /channel is unsupported/
        );
    }
);


test(
    "rejects unsupported intent",
    () => {
        assert.throws(
            () =>
                buildInsurancePrivateContactRequestFromForm(
                    form({
                        relationshipId:
                            "relationship:lead-1",
                        channel:
                            "phone",
                        intent:
                            "blast-everyone"
                    })
                ),
            /intent is unsupported/
        );
    }
);


test(
    "does not accept destination data from the browser contract",
    () => {
        const request =
            buildInsurancePrivateContactRequestFromForm(
                form({
                    relationshipId:
                        "relationship:lead-1",
                    channel:
                        "email",
                    intent:
                        "callback",
                    phone:
                        "+14325550123",
                    email:
                        "wrong-destination@example.com",
                    destination:
                        "browser-controlled"
                })
            );

        assert.deepEqual(
            Object.keys(
                request
            ).sort(),
            [
                "channel",
                "intent",
                "relationshipId"
            ]
        );
    }
);
