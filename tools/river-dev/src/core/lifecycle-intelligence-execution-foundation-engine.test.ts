import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligenceExecution
} from "./lifecycle-intelligence-execution-foundation-engine";

test(
"creates trusted execution from trusted dispatch",
() => {

const execution =
createLifecycleIntelligenceExecution(
{
version:
"1.0.0",

objective:
"Execution test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-authorization",

dispatch:
[
{
taskId:
"dispatch-boundary",

state:
"dispatched",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
execution.version,
"1.0.0"
);

assert.equal(
execution.trusted,
true
);

assert.equal(
execution.execution[0]!.taskId,
"dispatch-boundary"
);

assert.equal(
execution.execution[0]!.state,
"executed"
);

assert.equal(
execution.source,
"controlled-execution-lifecycle-intelligence-dispatch"
);

}
);

test(
"blocks execution from blocked dispatch",
() => {

const execution =
createLifecycleIntelligenceExecution(
{
version:
"1.0.0",

objective:
"Blocked execution test",

trusted:
false,

source:
"controlled-execution-lifecycle-intelligence-authorization",

dispatch:
[
{
taskId:
"execution-boundary",

state:
"blocked",

reason:
"approval required"
}
],

blockedReasons:
[
"approval required"
]

}
);

assert.equal(
execution.trusted,
false
);

assert.equal(
execution.execution[0]!.state,
"blocked"
);

assert.equal(
execution.blockedReasons.length,
1
);

}
);

test(
"preserves dispatch provenance in execution",
() => {

const execution =
createLifecycleIntelligenceExecution(
{
version:
"1.0.0",

objective:
"Provenance execution test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-authorization",

dispatch:
[
{
taskId:
"final-review",

state:
"dispatched",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
execution.execution[0]!.reason,
"human verified"
);

}
);
