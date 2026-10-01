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

                notStarted:
                    0,

                requested:
                    1,

                inProgress:
                    1,

                quoted:
                    1,

                bound:
                    0,

                declined:
                    0,

                lost:
                    0,

                stageNew:
                    3,

                stageContacted:
                    0,

                stageQualified:
                    0,

                stageAppointmentSet:
                    0,

                stageProposal:
                    0,

                stageWon:
                    0,

                stageLost:
                    0,

                stageNurture:
                    0,

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
    "triage exposes bound declined and lost as exact quote-status filters",
    () => {
        const statuses =
            [
                "bound",
                "declined",
                "lost"
            ] as const;

        const snapshot =
            createInsuranceLeadTriageSnapshot({
                relationships:
                    statuses.map(
                        (status,index) =>
                            relationship(
                                `relationship:triage:terminal:${status}`,
                                {
                                    stage:
                                        index === 0
                                            ? "new"
                                            : index === 1
                                                ? "proposal"
                                                : "qualified"
                                }
                            )
                    ),

                insurancePresentations:
                    statuses.map(
                        status =>
                            presentation(
                                `relationship:triage:terminal:${status}`,
                                {
                                    quoteStatus:
                                        status
                                }
                            )
                    ),

                now:
                    "2026-10-01T13:00:00.000Z"
            });

        for(const status of statuses){
            assert.deepEqual(
                selectInsuranceLeadTriageItems(
                    snapshot,
                    status
                ).map(
                    item =>
                        item.relationship
                            .relationshipId
                ),
                [
                    `relationship:triage:terminal:${status}`
                ]
            );
        }

        assert.equal(
            snapshot.summary.bound,
            1
        );

        assert.equal(
            snapshot.summary.declined,
            1
        );

        assert.equal(
            snapshot.summary.lost,
            1
        );
    }
);


test(
    "terminal quote filters do not infer quote outcome from relationship pipeline stage",
    () => {
        const snapshot =
            createInsuranceLeadTriageSnapshot({
                relationships: [
                    relationship(
                        "relationship:triage:pipeline-lost",
                        {
                            stage:
                                "lost"
                        }
                    )
                ],

                insurancePresentations: [
                    presentation(
                        "relationship:triage:pipeline-lost",
                        {
                            quoteStatus:
                                "quoted"
                        }
                    )
                ],

                now:
                    "2026-10-01T13:00:00.000Z"
            });

        assert.equal(
            selectInsuranceLeadTriageItems(
                snapshot,
                "lost"
            ).length,
            0
        );

        assert.equal(
            selectInsuranceLeadTriageItems(
                snapshot,
                "quoted"
            ).length,
            1
        );
    }
);


test(
    "triage exposes not-started as an exact canonical quote-status filter",
    () => {
        const snapshot =
            createInsuranceLeadTriageSnapshot({
                relationships: [
                    relationship(
                        "relationship:triage:not-started",
                        {
                            stage:
                                "qualified"
                        }
                    ),
                    relationship(
                        "relationship:triage:requested-ingress"
                    )
                ],

                insurancePresentations: [
                    presentation(
                        "relationship:triage:not-started",
                        {
                            quoteStatus:
                                "not-started",

                            acquisitionSource:
                                undefined
                        }
                    ),
                    presentation(
                        "relationship:triage:requested-ingress",
                        {
                            quoteStatus:
                                "requested",

                            acquisitionSource:
                                "website"
                        }
                    )
                ],

                now:
                    "2026-10-01T13:00:00.000Z"
            });

        assert.deepEqual(
            selectInsuranceLeadTriageItems(
                snapshot,
                "not-started"
            ).map(
                item =>
                    item.relationship
                        .relationshipId
            ),
            [
                "relationship:triage:not-started"
            ]
        );

        assert.equal(
            snapshot.summary
                .notStarted,
            1
        );
    }
);


test(
    "not-started queue does not absorb canonical requested website quote ingress",
    () => {
        const snapshot =
            createInsuranceLeadTriageSnapshot({
                relationships: [
                    relationship(
                        "relationship:triage:website-requested"
                    )
                ],

                insurancePresentations: [
                    presentation(
                        "relationship:triage:website-requested",
                        {
                            quoteStatus:
                                "requested",

                            acquisitionSource:
                                "website"
                        }
                    )
                ],

                now:
                    "2026-10-01T13:00:00.000Z"
            });

        assert.equal(
            selectInsuranceLeadTriageItems(
                snapshot,
                "not-started"
            ).length,
            0
        );

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
                "new"
            ).length,
            1
        );
    }
);


test(
    "not-started quote filter does not infer status from relationship pipeline stage",
    () => {
        const snapshot =
            createInsuranceLeadTriageSnapshot({
                relationships: [
                    relationship(
                        "relationship:triage:new-but-requested",
                        {
                            stage:
                                "new"
                        }
                    )
                ],

                insurancePresentations: [
                    presentation(
                        "relationship:triage:new-but-requested",
                        {
                            quoteStatus:
                                "requested"
                        }
                    )
                ],

                now:
                    "2026-10-01T13:00:00.000Z"
            });

        assert.equal(
            selectInsuranceLeadTriageItems(
                snapshot,
                "not-started"
            ).length,
            0
        );
    }
);


test(
    "triage exposes every canonical pipeline stage through namespaced stage filters",
    () => {
        const stages =
            [
                ["new","stage-new"],
                ["contacted","stage-contacted"],
                ["qualified","stage-qualified"],
                ["appointment-set","stage-appointment-set"],
                ["proposal","stage-proposal"],
                ["won","stage-won"],
                ["lost","stage-lost"],
                ["nurture","stage-nurture"]
            ] as const;

        const snapshot =
            createInsuranceLeadTriageSnapshot({
                relationships:
                    stages.map(
                        ([stage]) =>
                            relationship(
                                `relationship:triage:stage:${stage}`,
                                {
                                    stage
                                }
                            )
                    ),

                insurancePresentations:
                    stages.map(
                        ([stage]) =>
                            presentation(
                                `relationship:triage:stage:${stage}`,
                                {
                                    quoteStatus:
                                        "requested"
                                }
                            )
                    ),

                now:
                    "2026-10-01T13:00:00.000Z"
            });

        for(const [stage,filter] of stages){
            assert.deepEqual(
                selectInsuranceLeadTriageItems(
                    snapshot,
                    filter
                ).map(
                    item =>
                        item.relationship
                            .relationshipId
                ),
                [
                    `relationship:triage:stage:${stage}`
                ]
            );
        }

        assert.equal(snapshot.summary.stageNew,1);
        assert.equal(snapshot.summary.stageContacted,1);
        assert.equal(snapshot.summary.stageQualified,1);
        assert.equal(snapshot.summary.stageAppointmentSet,1);
        assert.equal(snapshot.summary.stageProposal,1);
        assert.equal(snapshot.summary.stageWon,1);
        assert.equal(snapshot.summary.stageLost,1);
        assert.equal(snapshot.summary.stageNurture,1);
    }
);


test(
    "pipeline stage lost remains independent from quote-status lost",
    () => {
        const snapshot =
            createInsuranceLeadTriageSnapshot({
                relationships: [
                    relationship(
                        "relationship:triage:stage-lost-only",
                        {
                            stage:
                                "lost"
                        }
                    ),
                    relationship(
                        "relationship:triage:quote-lost-only",
                        {
                            stage:
                                "qualified"
                        }
                    )
                ],

                insurancePresentations: [
                    presentation(
                        "relationship:triage:stage-lost-only",
                        {
                            quoteStatus:
                                "quoted"
                        }
                    ),
                    presentation(
                        "relationship:triage:quote-lost-only",
                        {
                            quoteStatus:
                                "lost"
                        }
                    )
                ],

                now:
                    "2026-10-01T13:00:00.000Z"
            });

        assert.deepEqual(
            selectInsuranceLeadTriageItems(
                snapshot,
                "stage-lost"
            ).map(
                item =>
                    item.relationship.relationshipId
            ),
            [
                "relationship:triage:stage-lost-only"
            ]
        );

        assert.deepEqual(
            selectInsuranceLeadTriageItems(
                snapshot,
                "lost"
            ).map(
                item =>
                    item.relationship.relationshipId
            ),
            [
                "relationship:triage:quote-lost-only"
            ]
        );
    }
);


test(
    "appointment-set stage remains independent from canonical appointmentAt presence",
    () => {
        const snapshot =
            createInsuranceLeadTriageSnapshot({
                relationships: [
                    relationship(
                        "relationship:triage:stage-appointment-only",
                        {
                            stage:
                                "appointment-set"
                        }
                    ),
                    relationship(
                        "relationship:triage:appointment-at-only",
                        {
                            stage:
                                "qualified",

                            appointmentAt:
                                "2026-10-02T15:00:00.000Z"
                        }
                    )
                ],

                insurancePresentations: [
                    presentation(
                        "relationship:triage:stage-appointment-only"
                    ),
                    presentation(
                        "relationship:triage:appointment-at-only"
                    )
                ],

                now:
                    "2026-10-01T13:00:00.000Z"
            });

        assert.deepEqual(
            selectInsuranceLeadTriageItems(
                snapshot,
                "stage-appointment-set"
            ).map(
                item =>
                    item.relationship.relationshipId
            ),
            [
                "relationship:triage:stage-appointment-only"
            ]
        );

        assert.deepEqual(
            selectInsuranceLeadTriageItems(
                snapshot,
                "appointments"
            ).map(
                item =>
                    item.relationship.relationshipId
            ),
            [
                "relationship:triage:appointment-at-only"
            ]
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
