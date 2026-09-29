import assert from "node:assert/strict";
import test from "node:test";

import {
    createInsuranceAcquisitionOutcomeFact
} from "./acquisition-outcomes";

import {
    createInsuranceAcquisitionOutcomeAnalytics,
    INSURANCE_ACQUISITION_OUTCOME_ANALYTICS_VERSION
} from "./acquisition-outcome-analytics";


function outcome(
    id:
        string,
    relationshipId:
        string,
    kind:
        "quoted" | "bound",
    occurredAt:
        string = "2026-09-29T20:00:00.000Z"
){
    return createInsuranceAcquisitionOutcomeFact({
        outcomeFactId:
            `outcome-fact:${id}`,

        relationshipId,

        kind,

        occurredAt
    });
}


test(
    "counts distinct quoted and bound relationships over explicit cohort",
    () => {
        const result =
            createInsuranceAcquisitionOutcomeAnalytics({
                relationshipIds: [
                    "relationship:ins-003s-a" as never,
                    "relationship:ins-003s-b" as never,
                    "relationship:ins-003s-c" as never
                ],

                outcomeFacts: [
                    outcome(
                        "quoted-a",
                        "relationship:ins-003s-a",
                        "quoted"
                    ),
                    outcome(
                        "bound-a",
                        "relationship:ins-003s-a",
                        "bound"
                    ),
                    outcome(
                        "quoted-b",
                        "relationship:ins-003s-b",
                        "quoted"
                    )
                ]
            });

        assert.deepEqual(
            result,
            {
                projectionVersion:
                    INSURANCE_ACQUISITION_OUTCOME_ANALYTICS_VERSION,

                relationshipCount:
                    3,

                quotedRelationshipCount:
                    2,

                boundRelationshipCount:
                    1,

                outcomeFactCount:
                    3,

                quotedOutcomeFactCount:
                    2,

                boundOutcomeFactCount:
                    1
            }
        );
    }
);


test(
    "deduplicates denominator cohort while preserving distinct outcome counts",
    () => {
        const result =
            createInsuranceAcquisitionOutcomeAnalytics({
                relationshipIds: [
                    "relationship:ins-003s-a" as never,
                    "relationship:ins-003s-a" as never,
                    "relationship:ins-003s-b" as never
                ],

                outcomeFacts: [
                    outcome(
                        "quoted-a",
                        "relationship:ins-003s-a",
                        "quoted"
                    )
                ]
            });

        assert.equal(
            result.relationshipCount,
            2
        );

        assert.equal(
            result.quotedRelationshipCount,
            1
        );
    }
);


test(
    "multiple facts of same kind for one relationship count one relationship but all facts",
    () => {
        const result =
            createInsuranceAcquisitionOutcomeAnalytics({
                relationshipIds: [
                    "relationship:ins-003s-a" as never
                ],

                outcomeFacts: [
                    outcome(
                        "quoted-a-1",
                        "relationship:ins-003s-a",
                        "quoted",
                        "2026-09-29T20:00:00.000Z"
                    ),
                    outcome(
                        "quoted-a-2",
                        "relationship:ins-003s-a",
                        "quoted",
                        "2026-09-29T20:05:00.000Z"
                    ),
                    outcome(
                        "bound-a-1",
                        "relationship:ins-003s-a",
                        "bound",
                        "2026-09-29T21:00:00.000Z"
                    ),
                    outcome(
                        "bound-a-2",
                        "relationship:ins-003s-a",
                        "bound",
                        "2026-09-29T21:05:00.000Z"
                    )
                ]
            });

        assert.equal(
            result.quotedRelationshipCount,
            1
        );

        assert.equal(
            result.boundRelationshipCount,
            1
        );

        assert.equal(
            result.quotedOutcomeFactCount,
            2
        );

        assert.equal(
            result.boundOutcomeFactCount,
            2
        );

        assert.equal(
            result.outcomeFactCount,
            4
        );
    }
);


test(
    "bound outcome does not implicitly count relationship as quoted",
    () => {
        const result =
            createInsuranceAcquisitionOutcomeAnalytics({
                relationshipIds: [
                    "relationship:ins-003s-bound-only" as never
                ],

                outcomeFacts: [
                    outcome(
                        "bound-only",
                        "relationship:ins-003s-bound-only",
                        "bound"
                    )
                ]
            });

        assert.equal(
            result.quotedRelationshipCount,
            0
        );

        assert.equal(
            result.boundRelationshipCount,
            1
        );
    }
);


test(
    "rejects duplicate outcome fact identity",
    () => {
        const duplicate =
            outcome(
                "duplicate",
                "relationship:ins-003s-a",
                "quoted"
            );

        assert.throws(
            () =>
                createInsuranceAcquisitionOutcomeAnalytics({
                    relationshipIds: [
                        "relationship:ins-003s-a" as never
                    ],

                    outcomeFacts: [
                        duplicate,
                        duplicate
                    ]
                }),
            /unique outcomeFactId/
        );
    }
);


test(
    "rejects outcome fact outside explicit denominator cohort",
    () => {
        assert.throws(
            () =>
                createInsuranceAcquisitionOutcomeAnalytics({
                    relationshipIds: [
                        "relationship:ins-003s-a" as never
                    ],

                    outcomeFacts: [
                        outcome(
                            "quoted-b",
                            "relationship:ins-003s-b",
                            "quoted"
                        )
                    ]
                }),
            /outside the explicit analytics cohort/
        );
    }
);


test(
    "empty cohort and empty facts are deterministic zero analytics",
    () => {
        const result =
            createInsuranceAcquisitionOutcomeAnalytics({
                relationshipIds:
                    [],

                outcomeFacts:
                    []
            });

        assert.deepEqual(
            result,
            {
                projectionVersion:
                    INSURANCE_ACQUISITION_OUTCOME_ANALYTICS_VERSION,

                relationshipCount:
                    0,

                quotedRelationshipCount:
                    0,

                boundRelationshipCount:
                    0,

                outcomeFactCount:
                    0,

                quotedOutcomeFactCount:
                    0,

                boundOutcomeFactCount:
                    0
            }
        );
    }
);


test(
    "rejects outcome facts when denominator cohort is empty",
    () => {
        assert.throws(
            () =>
                createInsuranceAcquisitionOutcomeAnalytics({
                    relationshipIds:
                        [],

                    outcomeFacts: [
                        outcome(
                            "quoted-orphan",
                            "relationship:ins-003s-orphan",
                            "quoted"
                        )
                    ]
                }),
            /outside the explicit analytics cohort/
        );
    }
);
