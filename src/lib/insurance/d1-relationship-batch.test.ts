import assert from "node:assert/strict";
import test from "node:test";

import type {
    RiverCrmRelationshipId
} from "../river-os/crm-growth-contracts";

import {
    INSURANCE_D1_RELATIONSHIP_BATCH_SIZE,
    chunkInsuranceD1RelationshipIds,
    compareInsuranceD1RelationshipIds
} from "./d1-relationship-batch";


test(
    "insurance D1 relationship batching partitions one hundred plus one deterministically",
    () => {
        const relationshipIds =
            Array.from(
                {
                    length:
                        101
                },
                (
                    _,
                    index
                ) =>
                    `relationship:ins-005e-${String(
                        index
                    ).padStart(
                        3,
                        "0"
                    )}` as
                        RiverCrmRelationshipId
            );

        const chunks =
            chunkInsuranceD1RelationshipIds(
                relationshipIds
            );

        assert.equal(
            INSURANCE_D1_RELATIONSHIP_BATCH_SIZE,
            100
        );

        assert.equal(
            chunks.length,
            2
        );

        assert.equal(
            chunks[0]?.length,
            100
        );

        assert.equal(
            chunks[1]?.length,
            1
        );

        assert.deepEqual(
            chunks.flat(),
            relationshipIds
        );
    }
);


test(
    "insurance D1 relationship batching preserves empty input without synthetic chunks",
    () => {
        assert.deepEqual(
            chunkInsuranceD1RelationshipIds(
                []
            ),
            []
        );
    }
);


test(
    "insurance D1 relationship comparator exposes canonical ascending relationship ordering",
    () => {
        const values = [
            "relationship:ins-005e-z",
            "relationship:ins-005e-a",
            "relationship:ins-005e-m"
        ] as RiverCrmRelationshipId[];

        values.sort(
            compareInsuranceD1RelationshipIds
        );

        assert.deepEqual(
            values,
            [
                "relationship:ins-005e-a",
                "relationship:ins-005e-m",
                "relationship:ins-005e-z"
            ]
        );
    }
);
