import assert from "node:assert/strict";
import test from "node:test";

import {
    createExecutionDispatcher
} from "./dispatcher-engine";

test(
"creates dispatchable state from executable action",
() => {

const dispatcher =
    createExecutionDispatcher(
    {
        version:
            "1.0.0",

        objective:
            "Dispatcher test",

        ready:
            true,

        actions: [

            {
                taskId:
                    "task-1",

                state:
                    "executable",

                reason:
                    "action approved"
            }

        ],

        blockedReasons:
            []

    }
);

assert.equal(
    dispatcher.version,
    "1.0.0"
);

assert.equal(
    dispatcher.dispatches[0]!.state,
    "dispatchable"
);

assert.equal(
    dispatcher.ready,
    true
);

}
);


test(
"blocks dispatcher from blocked action",
() => {

const dispatcher =
    createExecutionDispatcher(
    {
        version:
            "1.0.0",

        objective:
            "Blocked dispatcher test",

        ready:
            false,

        actions: [

            {
                taskId:
                    "task-1",

                state:
                    "blocked",

                reason:
                    "blocked execution"
            }

        ],

        blockedReasons:
        [
            "blocked execution"
        ]

    }
);

assert.equal(
    dispatcher.ready,
    false
);

assert.equal(
    dispatcher.dispatches[0]!.state,
    "blocked"
);

assert.equal(
    dispatcher.blockedReasons.length,
    1
);

}
);


test(
"requires approval before dispatcher readiness",
() => {

const dispatcher =
    createExecutionDispatcher(
    {
        version:
            "1.0.0",

        objective:
            "Approval dispatcher test",

        ready:
            true,

        actions: [

            {
                taskId:
                    "task-1",

                state:
                    "approval-required",

                reason:
                    "awaiting approval"
            }

        ],

        blockedReasons:
            []

    }
);

assert.equal(
    dispatcher.ready,
    false
);

assert.equal(
    dispatcher.dispatches[0]!.state,
    "approval-required"
);

}
);
