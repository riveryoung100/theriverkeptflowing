import assert from "node:assert/strict";
import test from "node:test";

import {
    createSemanticClaimIdentity,
    createSemanticRelationIdentity,
    createSemanticScopedIdentity
} from "./identity";


test(
    "relation identity cannot collide through embedded legacy delimiters",
    () => {

        const first =
            createSemanticRelationIdentity(
                "alpha\u001fbeta",
                "gamma",
                "related-to"
            );

        const second =
            createSemanticRelationIdentity(
                "alpha",
                "beta\u001fgamma",
                "related-to"
            );

        assert.notEqual(
            first,
            second
        );

    }
);


test(
    "claim identity preserves object key versus object value semantics",
    () => {

        const keyClaim =
            createSemanticClaimIdentity(
                "subject",
                "references",
                "same-text",
                undefined
            );

        const valueClaim =
            createSemanticClaimIdentity(
                "subject",
                "references",
                undefined,
                "same-text"
            );

        assert.notEqual(
            keyClaim,
            valueClaim
        );

    }
);


test(
    "scoped semantic identity cannot collide through colon placement",
    () => {

        const first =
            createSemanticScopedIdentity(
                "semantic-relation",
                "derivative:alpha",
                '["relation","beta","gamma","related-to"]'
            );

        const second =
            createSemanticScopedIdentity(
                "semantic-relation",
                "derivative",
                '["relation","alpha:beta","gamma","related-to"]'
            );

        assert.notEqual(
            first,
            second
        );

    }
);
