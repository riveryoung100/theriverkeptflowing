import assert from "node:assert/strict";
import test from "node:test";

import {
    assertKnowledgeInsightId,
    createKnowledgeInsightId,
    isKnowledgeInsightId,
    parseKnowledgeInsightId
} from "./identifiers";


test(
    "creates valid knowledge insight identifiers",
    () => {

        const id =
            createKnowledgeInsightId();

        assert.equal(
            isKnowledgeInsightId(
                id
            ),
            true
        );

        assert.equal(
            id.startsWith(
                "insight:"
            ),
            true
        );

    }
);


test(
    "creates unique knowledge insight identifiers",
    () => {

        const first =
            createKnowledgeInsightId();

        const second =
            createKnowledgeInsightId();

        assert.notEqual(
            first,
            second
        );

    }
);


test(
    "recognizes valid knowledge insight identifiers",
    () => {

        const id =
            createKnowledgeInsightId();

        assert.equal(
            isKnowledgeInsightId(
                id
            ),
            true
        );

    }
);


test(
    "rejects malformed knowledge insight identifiers",
    () => {

        const invalidValues = [
            "",
            "insight:",
            "knowledge:123",
            "insight:not-a-uuid",
            "insight:00000000-0000-0000-0000-000000000000",
            null,
            undefined,
            42
        ];

        for (
            const value of
            invalidValues
        ) {

            assert.equal(
                isKnowledgeInsightId(
                    value
                ),
                false
            );

        }

    }
);


test(
    "assertion accepts valid knowledge insight identifiers",
    () => {

        const id =
            createKnowledgeInsightId();

        assert.doesNotThrow(
            () => {
                assertKnowledgeInsightId(
                    id
                );
            }
        );

    }
);


test(
    "assertion rejects invalid knowledge insight identifiers",
    () => {

        assert.throws(
            () => {
                assertKnowledgeInsightId(
                    "insight:invalid"
                );
            },
            TypeError
        );

    }
);


test(
    "parses knowledge insight identifiers",
    () => {

        const id =
            createKnowledgeInsightId();

        const parsed =
            parseKnowledgeInsightId(
                id
            );

        assert.equal(
            parsed.prefix,
            "insight"
        );

        assert.equal(
            parsed.uuid,
            id.slice(
                "insight:".length
            )
        );

    }
);
