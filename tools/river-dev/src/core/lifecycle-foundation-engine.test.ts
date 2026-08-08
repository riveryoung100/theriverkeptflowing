import assert from "node:assert/strict";
import test from "node:test";

import {
createExecutionLifecycle
} from "./lifecycle-foundation-engine";

test(
"creates active lifecycle from completed execution",
() => {

const lifecycle =
createExecutionLifecycle(
{
version:
"1.0.0",

objective:
"Lifecycle test",

completed:
true,

source:
"controlled-execution-approval",

completion:
[
{
taskId:
"completion-boundary",

state:
"completed",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
lifecycle.version,
"1.0.0"
);

assert.equal(
lifecycle.active,
true
);

assert.equal(
lifecycle.lifecycle[0]!.taskId,
"completion-boundary"
);

assert.equal(
lifecycle.lifecycle[0]!.state,
"active"
);

assert.equal(
lifecycle.source,
"controlled-execution-completion"
);

}
);

test(
"blocks lifecycle from incomplete completion",
() => {

const lifecycle =
createExecutionLifecycle(
{
version:
"1.0.0",

objective:
"Blocked lifecycle test",

completed:
false,

source:
"controlled-execution-approval",

completion:
[
{
taskId:
"authorization",

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
lifecycle.active,
false
);

assert.equal(
lifecycle.lifecycle[0]!.state,
"blocked"
);

assert.equal(
lifecycle.blockedReasons.length,
1
);

}
);

test(
"preserves completion provenance in lifecycle",
() => {

const lifecycle =
createExecutionLifecycle(
{
version:
"1.0.0",

objective:
"Provenance lifecycle test",

completed:
true,

source:
"controlled-execution-approval",

completion:
[
{
taskId:
"final-review",

state:
"completed",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
lifecycle.lifecycle[0]!.reason,
"human verified"
);

}
);
