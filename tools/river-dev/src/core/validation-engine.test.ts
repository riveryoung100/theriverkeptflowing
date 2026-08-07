import assert from "node:assert/strict";
import test from "node:test";

import {
validateExecutionManifest
} from "./validation-engine";


test(
"validates approved execution tasks",
() => {

const result =
    validateExecutionManifest(
        {
            version:
                "1.0.0",

            objective:
                "Validation test",

            tasks: [
                {
                    id:
                        "task-1",

                    path:
                        "tools/river-dev/src/core/validation-engine.ts",

                    action:
                        "create",

                    priority:
                        10,

                    reason:
                        "new validation engine"
                }
            ],

            approvalRequired:
                []
        }
    );


assert.equal(
    result.ready,
    true
);


assert.equal(
    result.decisions[0]!.valid,
    true
);


assert.equal(
    result.decisions[0]!.requiresApproval,
    true
);

}
);


test(
"blocks protected execution paths",
() => {

const result =
    validateExecutionManifest(
        {
            version:
                "1.0.0",

            objective:
                "Protected path test",

            tasks: [
                {
                    id:
                        "task-1",

                    path:
                        ".env",

                    action:
                        "modify",

                    priority:
                        10,

                    reason:
                        "secret change"
                }
            ],

            approvalRequired:
                []
        }
    );


assert.equal(
    result.ready,
    false
);


assert.equal(
    result.decisions[0]!.valid,
    false
);


assert.match(
    result.blockedReasons[0]!,
    /protected/
);

}
);
