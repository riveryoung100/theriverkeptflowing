import assert from "node:assert/strict";
import test from "node:test";

import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";

import {
    INSURANCE_ACQUISITION_OUTCOME_ANALYTICS_VERSION
} from "./acquisition-outcome-analytics";

import {
    createInsuranceAcquisitionOutcomeFact
} from "./acquisition-outcomes";

import type {
    InsuranceAcquisitionOutcomeFact
} from "./acquisition-outcomes";

import {
    createInsuranceAcquisitionOutcomeAnalyticsApplication
} from "./d1-acquisition-outcome-analytics";

import type {
    InsuranceAcquisitionOutcomeAnalyticsReader
} from "./d1-acquisition-outcome-analytics";


function outcome(
    id:
        string,
    relationshipId:
        string,
    kind:
        "quoted" | "bound"
): InsuranceAcquisitionOutcomeFact {
    return createInsuranceAcquisitionOutcomeFact({
        outcomeFactId:
            `outcome-fact:${id}`,

        relationshipId,

        kind,

        occurredAt:
            "2026-09-29T20:00:00.000Z"
    });
}


class RecordingOutcomeReader
implements InsuranceAcquisitionOutcomeAnalyticsReader {
    calls =
        0;

    requestedRelationshipIds:
        readonly RiverCrmRelationshipId[] | undefined;

    constructor(
        private readonly facts:
            readonly InsuranceAcquisitionOutcomeFact[]
    ){}

    async listForRelationships(
        relationshipIds:
            readonly RiverCrmRelationshipId[]
    ): Promise<
        readonly InsuranceAcquisitionOutcomeFact[]
    > {
        this.calls +=
            1;

        this.requestedRelationshipIds =
            relationshipIds;

        return this.facts;
    }
}


test(
    "loads outcome facts once and delegates distinct relationship counting to pure analytics",
    async () => {
        const reader =
            new RecordingOutcomeReader([
                outcome(
                    "quoted-a",
                    "relationship:ins-003t-a",
                    "quoted"
                ),
                outcome(
                    "bound-a",
                    "relationship:ins-003t-a",
                    "bound"
                ),
                outcome(
                    "quoted-b",
                    "relationship:ins-003t-b",
                    "quoted"
                )
            ]);

        const application =
            createInsuranceAcquisitionOutcomeAnalyticsApplication(
                reader
            );

        const result =
            await application
                .getAnalytics({
                    relationshipIds: [
                        "relationship:ins-003t-a" as never,
                        "relationship:ins-003t-b" as never,
                        "relationship:ins-003t-c" as never
                    ]
                });

        assert.equal(
            reader.calls,
            1
        );

        assert.deepEqual(
            reader.requestedRelationshipIds,
            [
                "relationship:ins-003t-a",
                "relationship:ins-003t-b",
                "relationship:ins-003t-c"
            ]
        );

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
    "preserves caller cohort for persistence while pure analytics owns denominator deduplication",
    async () => {
        const reader =
            new RecordingOutcomeReader([
                outcome(
                    "quoted-a",
                    "relationship:ins-003t-a",
                    "quoted"
                )
            ]);

        const application =
            createInsuranceAcquisitionOutcomeAnalyticsApplication(
                reader
            );

        const result =
            await application
                .getAnalytics({
                    relationshipIds: [
                        "relationship:ins-003t-a" as never,
                        "relationship:ins-003t-a" as never,
                        "relationship:ins-003t-b" as never
                    ]
                });

        assert.deepEqual(
            reader.requestedRelationshipIds,
            [
                "relationship:ins-003t-a",
                "relationship:ins-003t-a",
                "relationship:ins-003t-b"
            ]
        );

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
    "empty cohort performs one reader delegation and returns deterministic zero analytics",
    async () => {
        const reader =
            new RecordingOutcomeReader(
                []
            );

        const application =
            createInsuranceAcquisitionOutcomeAnalyticsApplication(
                reader
            );

        const result =
            await application
                .getAnalytics({
                    relationshipIds:
                        []
                });

        assert.equal(
            reader.calls,
            1
        );

        assert.deepEqual(
            reader.requestedRelationshipIds,
            []
        );

        assert.equal(
            result.relationshipCount,
            0
        );

        assert.equal(
            result.quotedRelationshipCount,
            0
        );

        assert.equal(
            result.boundRelationshipCount,
            0
        );
    }
);


test(
    "rejects reader result outside explicit cohort through pure canonical projection",
    async () => {
        const reader =
            new RecordingOutcomeReader([
                outcome(
                    "quoted-outside",
                    "relationship:ins-003t-outside",
                    "quoted"
                )
            ]);

        const application =
            createInsuranceAcquisitionOutcomeAnalyticsApplication(
                reader
            );

        await assert.rejects(
            application
                .getAnalytics({
                    relationshipIds: [
                        "relationship:ins-003t-inside" as never
                    ]
                }),
            /outside the explicit analytics cohort/
        );

        assert.equal(
            reader.calls,
            1
        );
    }
);


test(
    "rejects duplicate outcome identity returned by reader through pure canonical projection",
    async () => {
        const duplicate =
            outcome(
                "duplicate",
                "relationship:ins-003t-a",
                "quoted"
            );

        const reader =
            new RecordingOutcomeReader([
                duplicate,
                duplicate
            ]);

        const application =
            createInsuranceAcquisitionOutcomeAnalyticsApplication(
                reader
            );

        await assert.rejects(
            application
                .getAnalytics({
                    relationshipIds: [
                        "relationship:ins-003t-a" as never
                    ]
                }),
            /unique outcomeFactId/
        );

        assert.equal(
            reader.calls,
            1
        );
    }
);


test(
    "bound-only evidence remains bound-only through D1-backed composition",
    async () => {
        const reader =
            new RecordingOutcomeReader([
                outcome(
                    "bound-only",
                    "relationship:ins-003t-bound-only",
                    "bound"
                )
            ]);

        const application =
            createInsuranceAcquisitionOutcomeAnalyticsApplication(
                reader
            );

        const result =
            await application
                .getAnalytics({
                    relationshipIds: [
                        "relationship:ins-003t-bound-only" as never
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
