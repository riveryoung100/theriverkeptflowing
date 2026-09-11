import assert from "node:assert/strict";
import test from "node:test";

import {
    buildRiverCrmWorkspacePath,
    createRiverCrmRelationship,
    summarizeRiverCrmWorkspace
} from "./crm-workspace";


function relationship(
    overrides:
        Partial<Parameters<typeof createRiverCrmRelationship>[0]> = {}
) {

    return createRiverCrmRelationship({
        relationshipId:
            "relationship:lead:001",

        displayName:
            "Example Lead",

        kind:
            "lead",

        stage:
            "new",

        source:
            "website",

        createdAt:
            "2026-09-11T12:00:00.000Z",

        updatedAt:
            "2026-09-11T12:00:00.000Z",

        ...overrides
    });

}


test(
    "River CRM preserves governed relationship identity and pipeline state",
    () => {

        const record =
            relationship();

        assert.equal(
            record.relationshipId,
            "relationship:lead:001"
        );

        assert.equal(
            record.kind,
            "lead"
        );

        assert.equal(
            record.stage,
            "new"
        );

    }
);


test(
    "River CRM rejects invalid relationship identity",
    () => {

        assert.throws(
            () =>
                relationship({
                    relationshipId:
                        "lead:001"
                }),
            /relationship identity/
        );

    }
);


test(
    "River CRM summarizes pipeline, appointments, and due follow-up",
    () => {

        const summary =
            summarizeRiverCrmWorkspace(
                [
                    relationship({
                        nextFollowUpAt:
                            "2026-09-11T10:00:00.000Z"
                    }),

                    relationship({
                        relationshipId:
                            "relationship:client:002",

                        kind:
                            "client",

                        stage:
                            "won",

                        appointmentAt:
                            "2026-09-12T15:00:00.000Z"
                    }),

                    relationship({
                        relationshipId:
                            "relationship:lead:003",

                        stage:
                            "nurture"
                    })
                ],
                new Date(
                    "2026-09-11T16:00:00.000Z"
                )
            );

        assert.deepEqual(
            summary,
            {
                total:
                    3,

                active:
                    2,

                appointments:
                    1,

                followUps:
                    1,

                won:
                    1,

                nurture:
                    1
            }
        );

    }
);


test(
    "River CRM exposes its private workspace route",
    () => {

        assert.equal(
            buildRiverCrmWorkspacePath(),
            "/river-os/crm"
        );

    }
);
