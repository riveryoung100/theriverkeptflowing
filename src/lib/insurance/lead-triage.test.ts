import assert from "node:assert/strict";
import test from "node:test";

import {
    createRiverCrmRelationship
} from "../river-os/crm-workspace";

import {
    createInsuranceLeadTriageSnapshot,
    selectInsuranceLeadTriageItems
} from "./lead-triage";

import type {
    InsuranceLeadPresentation
} from "./lead-presentation";

import type {
    RiverCrmRelationship
} from "../river-os/crm-workspace";


function relationship(
    id:
        string,
    overrides:
        Partial<
            RiverCrmRelationship
        > = {}
):
    RiverCrmRelationship {

    return createRiverCrmRelationship({
        relationshipId:
            id,

        displayName:
            `Lead ${id}`,

        kind:
            "lead",

        stage:
            "new",

        source:
            "website",

        email:
            `${id.replaceAll(":", "-")}@example.com`,

        createdAt:
            "2026-10-01T12:00:00.000Z",

        updatedAt:
            "2026-10-01T12:00:00.000Z",

        ...overrides
    });
}


function presentation(
    id:
        string,
    overrides:
        Partial<
            InsuranceLeadPresentation
        > = {}
):
    InsuranceLeadPresentation {

    return {
        relationshipId:
            id,

        state:
            "TX",

        postalCode:
            "79720",

        productInterest:
            "home",

        quoteStatus:
            "requested",

        acquisitionSource:
            "website",

        consentChannels:
            [],

        doNotContact:
            false,

        recentEvents:
            [],

        ...overrides
    };
}


test(
    "triage identifies a canonical new inbound website quote request",
    () => {
        const snapshot =
            createInsuranceLeadTriageSnapshot({
                relationships: [
                    relationship(
                        "relationship:triage:new"
                    )
                ],

                insurancePresentations: [
                    presentation(
                        "relationship:triage:new"
                    )
                ],

                now:
                    "2026-10-01T13:00:00.000Z"
            });

        assert.equal(
            snapshot.items.length,
            1
        );

        assert.equal(
            snapshot.items[0]!
                .flags
                .newInboundQuote,
            true
        );

        assert.equal(
            snapshot.summary
                .newInbound,
            1
        );
    }
);


test(
    "triage conservatively refuses to infer inbound quote origin without website acquisition attribution",
    () => {
        const snapshot =
            createInsuranceLeadTriageSnapshot({
                relationships: [
                    relationship(
                        "relationship:triage:no-origin"
                    )
                ],

                insurancePresentations: [
                    presentation(
                        "relationship:triage:no-origin",
                        {
                            acquisitionSource:
                                undefined
                        }
                    )
                ],

                now:
                    "2026-10-01T13:00:00.000Z"
            });

        assert.equal(
            snapshot.items[0]!
                .flags
                .newInboundQuote,
            false
        );
    }
);


test(
    "triage exposes requested in-progress quoted and unassigned filters without a score",
    () => {
        const snapshot =
            createInsuranceLeadTriageSnapshot({
                relationships: [
                    relationship(
                        "relationship:triage:requested",
                        {
                            updatedAt:
                                "2026-10-01T12:03:00.000Z"
                        }
                    ),
                    relationship(
                        "relationship:triage:progress",
                        {
                            updatedAt:
                                "2026-10-01T12:02:00.000Z"
                        }
                    ),
                    relationship(
                        "relationship:triage:quoted",
                        {
                            updatedAt:
                                "2026-10-01T12:01:00.000Z"
                        }
                    )
                ],

                insurancePresentations: [
                    presentation(
                        "relationship:triage:requested"
                    ),
                    presentation(
                        "relationship:triage:progress",
                        {
                            quoteStatus:
                                "in-progress",

                            assignedProducer:
                                "River"
                        }
                    ),
                    presentation(
                        "relationship:triage:quoted",
                        {
                            quoteStatus:
                                "quoted",

                            assignedProducer:
                                "River"
                        }
                    )
                ],

                now:
                    "2026-10-01T13:00:00.000Z"
            });

        assert.equal(
            selectInsuranceLeadTriageItems(
                snapshot,
                "requested"
            ).length,
            1
        );

        assert.equal(
            selectInsuranceLeadTriageItems(
                snapshot,
                "in-progress"
            ).length,
            1
        );

        assert.equal(
            selectInsuranceLeadTriageItems(
                snapshot,
                "quoted"
            ).length,
            1
        );

        assert.deepEqual(
            selectInsuranceLeadTriageItems(
                snapshot,
                "unassigned"
            ).map(
                item =>
                    item.relationship
                        .relationshipId
            ),
            [
                "relationship:triage:requested"
            ]
        );
    }
);


test(
    "triage marks an open insurance follow-up due at or before now",
    () => {
        const snapshot =
            createInsuranceLeadTriageSnapshot({
                relationships: [
                    relationship(
                        "relationship:triage:due",
                        {
                            nextFollowUpAt:
                                "2026-10-01T12:30:00.000Z"
                        }
                    )
                ],

                insurancePresentations: [
                    presentation(
                        "relationship:triage:due",
                        {
                            quoteStatus:
                                "in-progress"
                        }
                    )
                ],

                now:
                    "2026-10-01T13:00:00.000Z"
            });

        assert.equal(
            snapshot.items[0]!
                .flags
                .followUpDue,
            true
        );

        assert.equal(
            snapshot.summary
                .followUpDue,
            1
        );
    }
);


test(
    "triage excludes terminal insurance outcomes from follow-up-due filter",
    () => {
        for(const quoteStatus of [
            "bound",
            "declined",
            "lost"
        ] as const){
            const id =
                `relationship:triage:${quoteStatus}`;

            const snapshot =
                createInsuranceLeadTriageSnapshot({
                    relationships: [
                        relationship(
                            id,
                            {
                                nextFollowUpAt:
                                    "2026-10-01T12:30:00.000Z"
                            }
                        )
                    ],

                    insurancePresentations: [
                        presentation(
                            id,
                            {
                                quoteStatus
                            }
                        )
                    ],

                    now:
                        "2026-10-01T13:00:00.000Z"
                });

            assert.equal(
                snapshot.items[0]!
                    .flags
                    .followUpDue,
                false
            );
        }
    }
);


test(
    "triage surfaces contact suppression and contact-method presence independently",
    () => {
        const snapshot =
            createInsuranceLeadTriageSnapshot({
                relationships: [
                    relationship(
                        "relationship:triage:suppressed",
                        {
                            phone:
                                "4325550100"
                        }
                    )
                ],

                insurancePresentations: [
                    presentation(
                        "relationship:triage:suppressed",
                        {
                            doNotContact:
                                true
                        }
                    )
                ],

                now:
                    "2026-10-01T13:00:00.000Z"
            });

        assert.equal(
            snapshot.items[0]!
                .flags
                .suppressed,
            true
        );

        assert.equal(
            snapshot.items[0]!
                .flags
                .hasContactMethod,
            true
        );

        assert.equal(
            selectInsuranceLeadTriageItems(
                snapshot,
                "suppressed"
            ).length,
            1
        );
    }
);


test(
    "triage ignores non-insurance relationships rather than manufacturing insurance context",
    () => {
        const snapshot =
            createInsuranceLeadTriageSnapshot({
                relationships: [
                    relationship(
                        "relationship:triage:generic"
                    )
                ],

                insurancePresentations:
                    [],

                now:
                    "2026-10-01T13:00:00.000Z"
            });

        assert.equal(
            snapshot.items.length,
            0
        );

        assert.equal(
            snapshot.summary
                .totalInsurance,
            0
        );
    }
);


test(
    "triage rejects orphan insurance presentation identity",
    () => {
        assert.throws(
            () =>
                createInsuranceLeadTriageSnapshot({
                    relationships:
                        [],

                    insurancePresentations: [
                        presentation(
                            "relationship:triage:orphan"
                        )
                    ],

                    now:
                        "2026-10-01T13:00:00.000Z"
                }),
            /match the relationship cohort/
        );
    }
);


test(
    "triage rejects duplicate canonical relationship identity",
    () => {
        const duplicate =
            relationship(
                "relationship:triage:duplicate"
            );

        assert.throws(
            () =>
                createInsuranceLeadTriageSnapshot({
                    relationships: [
                        duplicate,
                        duplicate
                    ],

                    insurancePresentations:
                        [],

                    now:
                        "2026-10-01T13:00:00.000Z"
                }),
            /duplicate relationship identity/
        );
    }
);


test(
    "triage rejects duplicate insurance presentation identity",
    () => {
        const id =
            "relationship:triage:duplicate-presentation";

        assert.throws(
            () =>
                createInsuranceLeadTriageSnapshot({
                    relationships: [
                        relationship(
                            id
                        )
                    ],

                    insurancePresentations: [
                        presentation(
                            id
                        ),
                        presentation(
                            id
                        )
                    ],

                    now:
                        "2026-10-01T13:00:00.000Z"
                }),
            /duplicate insurance presentation identity/
        );
    }
);


test(
    "triage ordering is deterministic by updatedAt descending then relationshipId ascending",
    () => {
        const snapshot =
            createInsuranceLeadTriageSnapshot({
                relationships: [
                    relationship(
                        "relationship:triage:b",
                        {
                            updatedAt:
                                "2026-10-01T12:05:00.000Z"
                        }
                    ),
                    relationship(
                        "relationship:triage:c",
                        {
                            updatedAt:
                                "2026-10-01T12:04:00.000Z"
                        }
                    ),
                    relationship(
                        "relationship:triage:a",
                        {
                            updatedAt:
                                "2026-10-01T12:05:00.000Z"
                        }
                    )
                ],

                insurancePresentations: [
                    presentation(
                        "relationship:triage:a"
                    ),
                    presentation(
                        "relationship:triage:b"
                    ),
                    presentation(
                        "relationship:triage:c"
                    )
                ],

                now:
                    "2026-10-01T13:00:00.000Z"
            });

        assert.deepEqual(
            snapshot.items.map(
                item =>
                    item.relationship
                        .relationshipId
            ),
            [
                "relationship:triage:a",
                "relationship:triage:b",
                "relationship:triage:c"
            ]
        );
    }
);


test(
    "triage summary reports explicit operational counts",
    () => {
        const snapshot =
            createInsuranceLeadTriageSnapshot({
                relationships: [
                    relationship(
                        "relationship:triage:new"
                    ),
                    relationship(
                        "relationship:triage:progress",
                        {
                            nextFollowUpAt:
                                "2026-10-01T12:00:00.000Z"
                        }
                    ),
                    relationship(
                        "relationship:triage:quoted"
                    )
                ],

                insurancePresentations: [
                    presentation(
                        "relationship:triage:new"
                    ),
                    presentation(
                        "relationship:triage:progress",
                        {
                            quoteStatus:
                                "in-progress",

                            assignedProducer:
                                "River"
                        }
                    ),
                    presentation(
                        "relationship:triage:quoted",
                        {
                            quoteStatus:
                                "quoted",

                            assignedProducer:
                                "River",

                            doNotContact:
                                true
                        }
                    )
                ],

                now:
                    "2026-10-01T13:00:00.000Z"
            });

        assert.deepEqual(
            snapshot.summary,
            {
                totalInsurance:
                    3,

                newInbound:
                    1,

                requested:
                    1,

                inProgress:
                    1,

                quoted:
                    1,

                unassigned:
                    1,

                followUpDue:
                    1,

                appointments:
                    0,

                suppressed:
                    1
            }
        );
    }
);


test(
    "triage appointments filter selects canonical insurance relationships with appointmentAt present",
    () => {
        const snapshot =
            createInsuranceLeadTriageSnapshot({
                relationships: [
                    relationship(
                        "relationship:triage:appointment",
                        {
                            appointmentAt:
                                "2026-09-30T15:00:00.000Z"
                        }
                    ),
                    relationship(
                        "relationship:triage:no-appointment"
                    )
                ],

                insurancePresentations: [
                    presentation(
                        "relationship:triage:appointment"
                    ),
                    presentation(
                        "relationship:triage:no-appointment"
                    )
                ],

                now:
                    "2026-10-01T13:00:00.000Z"
            });

        assert.deepEqual(
            selectInsuranceLeadTriageItems(
                snapshot,
                "appointments"
            ).map(
                item =>
                    item.relationship
                        .relationshipId
            ),
            [
                "relationship:triage:appointment"
            ]
        );

        assert.equal(
            snapshot.summary
                .appointments,
            1
        );
    }
);


test(
    "triage appointments filter does not invent upcoming overdue completion or attendance semantics",
    () => {
        const snapshot =
            createInsuranceLeadTriageSnapshot({
                relationships: [
                    relationship(
                        "relationship:triage:past-appointment",
                        {
                            appointmentAt:
                                "2026-09-01T15:00:00.000Z"
                        }
                    )
                ],

                insurancePresentations: [
                    presentation(
                        "relationship:triage:past-appointment"
                    )
                ],

                now:
                    "2026-10-01T13:00:00.000Z"
            });

        assert.equal(
            selectInsuranceLeadTriageItems(
                snapshot,
                "appointments"
            ).length,
            1
        );
    }
);


test(
    "triage rejects invalid generation timestamp",
    () => {
        assert.throws(
            () =>
                createInsuranceLeadTriageSnapshot({
                    relationships:
                        [],

                    insurancePresentations:
                        [],

                    now:
                        "not-a-timestamp"
                }),
            /valid now/
        );
    }
);
