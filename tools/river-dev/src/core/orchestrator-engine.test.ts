import assert from "node:assert/strict";
import test from "node:test";

import {
createExecutionOrchestrator
} from "./orchestrator-engine";

test(
"creates executable orchestrator from completed review boundary",
() => {

const orchestrator =
createExecutionOrchestrator(
{
version:
"1.0.0",

objective:
"Orchestrator test",

completed:
true,

reviews: [

{
taskId:
"task-1",

state:
"approved",

reason:
"review approved"

}

],

blockedReasons:
[]

}
);

assert.equal(
orchestrator.version,
"1.0.0"
);

assert.equal(
orchestrator.steps[0]!.state,
"complete"
);

assert.equal(
orchestrator.executable,
true
);

}
);


test(
"blocks orchestrator from blocked review boundary",
() => {

const orchestrator =
createExecutionOrchestrator(
{
version:
"1.0.0",

objective:
"Blocked orchestrator test",

completed:
false,

reviews: [

{
taskId:
"task-1",

state:
"blocked",

reason:
"review blocked"

}

],

blockedReasons:
[
"review blocked"
]

}
);

assert.equal(
orchestrator.executable,
false
);

assert.equal(
orchestrator.steps[0]!.state,
"blocked"
);

assert.equal(
orchestrator.blockedReasons.length,
1
);

}
);


test(
"requires confirmation for gated review boundary",
() => {

const orchestrator =
createExecutionOrchestrator(
{
version:
"1.0.0",

objective:
"Confirmation orchestrator test",

completed:
false,

reviews: [

{
taskId:
"task-1",

state:
"confirmation-required",

reason:
"awaiting confirmation"

}

],

blockedReasons:
[]

}
);

assert.equal(
orchestrator.executable,
false
);

assert.equal(
orchestrator.steps[0]!.state,
"confirmation-required"
);

}
);
