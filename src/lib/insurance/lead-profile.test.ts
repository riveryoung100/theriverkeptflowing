import assert from "node:assert/strict";
import test from "node:test";

import {
    createInsuranceLeadProfile
} from "./lead-profile";

function validInput() {
    return {
        relationshipId:
            "relationship:lead:insurance-001",
        state:
            "tx",
        postalCode:
            "79720",
        productInterest:
            "auto",
        quoteStatus:
            "requested",
        assignedProducer:
            "  River  ",
        createdAt:
            "2026-09-28T17:00:00.000Z",
        updatedAt:
            "2026-09-28T17:00:00.000Z"
    };
}

test(
    "Insurance lead profile accepts valid product and quote state and normalizes state",
    () => {
        const profile =
            createInsuranceLeadProfile(
                validInput()
            );

        assert.equal(
            profile.relationshipId,
            "relationship:lead:insurance-001"
        );

        assert.equal(
            profile.state,
            "TX"
        );

        assert.equal(
            profile.postalCode,
            "79720"
        );

        assert.equal(
            profile.productInterest,
            "auto"
        );

        assert.equal(
            profile.quoteStatus,
            "requested"
        );

        assert.equal(
            profile.assignedProducer,
            "River"
        );
    }
);

test(
    "Insurance lead profile accepts ZIP+4",
    () => {
        const profile =
            createInsuranceLeadProfile({
                ...validInput(),
                postalCode:
                    "79720-1234"
            });

        assert.equal(
            profile.postalCode,
            "79720-1234"
        );
    }
);

test(
    "Insurance lead profile rejects invalid state code",
    () => {
        assert.throws(
            () =>
                createInsuranceLeadProfile({
                    ...validInput(),
                    state:
                        "Texas"
                }),
            /state code/
        );
    }
);

test(
    "Insurance lead profile rejects invalid postal code",
    () => {
        assert.throws(
            () =>
                createInsuranceLeadProfile({
                    ...validInput(),
                    postalCode:
                        "7972"
                }),
            /ZIP/
        );
    }
);

test(
    "Insurance lead profile rejects unsupported product interest",
    () => {
        assert.throws(
            () =>
                createInsuranceLeadProfile({
                    ...validInput(),
                    productInterest:
                        "spaceship"
                }),
            /productInterest is not supported/
        );
    }
);

test(
    "Insurance lead profile rejects unsupported quote status",
    () => {
        assert.throws(
            () =>
                createInsuranceLeadProfile({
                    ...validInput(),
                    quoteStatus:
                        "maybe"
                }),
            /quoteStatus is not supported/
        );
    }
);

test(
    "Insurance lead profile rejects invalid canonical CRM relationship identity",
    () => {
        assert.throws(
            () =>
                createInsuranceLeadProfile({
                    ...validInput(),
                    relationshipId:
                        "insurance-lead:001"
                }),
            /canonical River CRM relationship identity/
        );
    }
);

test(
    "Insurance lead profile does not duplicate generic CRM contact fields",
    () => {
        const profile =
            createInsuranceLeadProfile(
                validInput()
            );

        assert.equal(
            "displayName" in profile,
            false
        );

        assert.equal(
            "email" in profile,
            false
        );

        assert.equal(
            "phone" in profile,
            false
        );

        assert.equal(
            "stage" in profile,
            false
        );

        assert.equal(
            "kind" in profile,
            false
        );
    }
);

test(
    "Insurance lead profile rejects updatedAt before createdAt",
    () => {
        assert.throws(
            () =>
                createInsuranceLeadProfile({
                    ...validInput(),
                    createdAt:
                        "2026-09-28T18:00:00.000Z",
                    updatedAt:
                        "2026-09-28T17:00:00.000Z"
                }),
            /not to precede/
        );
    }
);
