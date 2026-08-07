import assert from "node:assert/strict";
import test from "node:test";

import {
createExecutionWorkflow
} from "./orchestration-engine";

test(
"creates deterministic execution workflows",
() => {

const workflow =
createExecutionWorkflow(
{
version:
"1.0.0",

ready:
true,

decisions: [

{
taskId:
"task-1",

path:
"tools/river-dev/src/core/orchestration-engine.ts",

valid:
true,

reason:
"approved execution scope",

requiresApproval:
true

},

{
taskId:
"task-2",

path:
"tools/river-dev/src/core/context-engine.ts",

valid:
true,

reason:
"inspection allowed",

requiresApproval:
false

}

],

blockedReasons:
[]

},
"Build orchestration workflow"
);


assert.equal(
workflow.version,
"1.0.0"
);

assert.equal(
workflow.ready,
true
);

assert.equal(
workflow.steps[0]!.order,
1
);

assert.equal(
workflow.steps[0]!.status,
"approval-required"
);

assert.equal(
workflow.steps[1]!.status,
"ready"
);

}
);


test(
"blocks workflows with validation failures",
() => {

const workflow =
createExecutionWorkflow(
{
version:
"1.0.0",

ready:
false,

decisions: [

{
taskId:
"task-1",

path:
".env",

valid:
false,

reason:
"blocked protected repository path",

requiresApproval:
true

}

],

blockedReasons:
[
"blocked protected repository path"
]

},
"Blocked workflow"
);


assert.equal(
workflow.ready,
false
);

assert.equal(
workflow.steps[0]!.status,
"blocked"
);

assert.equal(
workflow.blockedReasons.length,
1
);

}
);
