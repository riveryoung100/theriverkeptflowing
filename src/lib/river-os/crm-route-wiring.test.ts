import assert from "node:assert/strict";
import {
    readFileSync
} from "node:fs";
import test from "node:test";
import {
    resolve
} from "node:path";


const crmCreateRouteSource =
    readFileSync(
        resolve(
            process.cwd(),
            "src/pages/river-os/actions/crm-create.ts"
        ),
        "utf8"
    );


test(
    "River CRM create route passes form data into the relationship builder",
    () => {

        assert.match(
            crmCreateRouteSource,
            /relationship\s*=\s*buildRiverCrmRelationshipFromForm\s*\(\s*formData\s*,\s*\{/s
        );

        assert.doesNotMatch(
            crmCreateRouteSource,
            /relationship\s*=\s*buildRiverCrmRelationshipFromForm\s*,/s
        );

    }
);


test(
    "River CRM create route checks same-origin writes against the request",
    () => {

        assert.match(
            crmCreateRouteSource,
            /isSameOriginRiverCrmWriteRequest\s*\(\s*request\s*\)/s
        );

    }
);