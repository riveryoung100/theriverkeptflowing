import assert from "node:assert/strict";
import test from "node:test";

import {
    buildRiverCrmRelationshipFromForm,
    isSameOriginRiverCrmWriteRequest,
    requireRiverCrmRelationshipId
} from "./crm-actions";

import {
    createRiverCrmRelationship
} from "./crm-workspace";


function form(
    entries:
        Record<string, string>
): FormData {

    const result =
        new FormData();

    for (
        const [
            key,
            value
        ] of Object.entries(
            entries
        )
    ) {

        result.set(
            key,
            value
        );

    }

    return result;

}


test(
    "River CRM builds a validated new relationship from private form input",
    () => {

        const relationship =
            buildRiverCrmRelationshipFromForm(
                form({
                    displayName:
                        "  Example Lead  ",
                    kind:
                        "lead",
                    stage:
                        "new",
                    source:
                        "  manual  ",
                    email:
                        " lead@example.com "
                }),
                {
                    relationshipId:
                        "relationship:lead:test-001",
                    now:
                        new Date(
                            "2026-09-11T20:00:00.000Z"
                        )
                }
            );

        assert.deepEqual(
            relationship,
            {
                relationshipId:
                    "relationship:lead:test-001",
                displayName:
                    "Example Lead",
                kind:
                    "lead",
                stage:
                    "new",
                source:
                    "manual",
                email:
                    "lead@example.com",
                createdAt:
                    "2026-09-11T20:00:00.000Z",
                updatedAt:
                    "2026-09-11T20:00:00.000Z"
            }
        );

    }
);


test(
    "River CRM update input preserves created time and scheduled state",
    () => {

        const existing =
            createRiverCrmRelationship({
                relationshipId:
                    "relationship:lead:test-002",
                displayName:
                    "Existing Lead",
                kind:
                    "lead",
                stage:
                    "contacted",
                source:
                    "website",
                nextFollowUpAt:
                    "2026-09-12T14:00:00.000Z",
                appointmentAt:
                    "2026-09-13T15:00:00.000Z",
                createdAt:
                    "2026-09-10T12:00:00.000Z",
                updatedAt:
                    "2026-09-10T12:00:00.000Z"
            });

        const updated =
            buildRiverCrmRelationshipFromForm(
                form({
                    displayName:
                        "Existing Lead",
                    kind:
                        "client",
                    stage:
                        "won",
                    source:
                        "manual",
                    owner:
                        "River"
                }),
                {
                    relationshipId:
                        existing.relationshipId,
                    existing,
                    now:
                        new Date(
                            "2026-09-11T21:00:00.000Z"
                        )
                }
            );

        assert.equal(
            updated.createdAt,
            existing.createdAt
        );

        assert.equal(
            updated.updatedAt,
            "2026-09-11T21:00:00.000Z"
        );

        assert.equal(
            updated.nextFollowUpAt,
            existing.nextFollowUpAt
        );

        assert.equal(
            updated.appointmentAt,
            existing.appointmentAt
        );

        assert.equal(
            updated.stage,
            "won"
        );

        assert.equal(
            updated.kind,
            "client"
        );

    }
);


test(
    "River CRM rejects unsupported private form state",
    () => {

        assert.throws(
            () =>
                buildRiverCrmRelationshipFromForm(
                    form({
                        displayName:
                            "Example",
                        kind:
                            "unknown",
                        stage:
                            "new",
                        source:
                            "manual"
                    }),
                    {
                        relationshipId:
                            "relationship:lead:test-003"
                    }
                ),
            /kind is not supported/
        );

        assert.throws(
            () =>
                buildRiverCrmRelationshipFromForm(
                    form({
                        displayName:
                            "Example",
                        kind:
                            "lead",
                        stage:
                            "unknown",
                        source:
                            "manual"
                    }),
                    {
                        relationshipId:
                            "relationship:lead:test-004"
                    }
                ),
            /stage is not supported/
        );

    }
);

test(
    "River CRM rejects invalid update relationship identity",
    () => {

        assert.equal(
            requireRiverCrmRelationshipId(
                "relationship:lead:test-005"
            ),
            "relationship:lead:test-005"
        );

        assert.throws(
            () =>
                requireRiverCrmRelationshipId(
                    "lead:test-005"
                ),
            /valid relationship identity/
        );

    }
);

test(
    "River CRM accepts only same-origin private write requests",
    () => {

        assert.equal(
            isSameOriginRiverCrmWriteRequest(
                new Request(
                    "https://theriverkeptflowing.com/river-os/actions/crm-create",
                    {
                        method:
                            "POST",
                        headers: {
                            origin:
                                "https://theriverkeptflowing.com"
                        }
                    }
                )
            ),
            true
        );

        assert.equal(
            isSameOriginRiverCrmWriteRequest(
                new Request(
                    "https://theriverkeptflowing.com/river-os/actions/crm-create",
                    {
                        method:
                            "POST",
                        headers: {
                            origin:
                                "https://example.com"
                        }
                    }
                )
            ),
            false
        );

        assert.equal(
            isSameOriginRiverCrmWriteRequest(
                new Request(
                    "https://theriverkeptflowing.com/river-os/actions/crm-create",
                    {
                        method:
                            "POST"
                    }
                )
            ),
            false
        );

    }
);