import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligenceDispatch
} from "./lifecycle-intelligence-dispatch-foundation-engine";

test(
"creates trusted dispatch from trusted authorization",
() => {

const dispatch =
createLifecycleIntelligenceDispatch(
{
version:
"1.0.0",

objective:
"Dispatch test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-governance",

authorization:
[
{
taskId:
"authorization-boundary",

state:
"authorized",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
dispatch.version,
"1.0.0"
);

assert.equal(
dispatch.trusted,
true
);

assert.equal(
dispatch.dispatch[0]!.taskId,
"authorization-boundary"
);

assert.equal(
dispatch.dispatch[0]!.state,
"dispatched"
);

assert.equal(
dispatch.source,
"controlled-execution-lifecycle-intelligence-authorization"
);

}
);

test(
"blocks dispatch from blocked authorization",
() => {

const dispatch =
createLifecycleIntelligenceDispatch(
{
version:
"1.0.0",

objective:
"Blocked dispatch test",

trusted:
false,

source:
"controlled-execution-lifecycle-intelligence-governance",

authorization:
[
{
taskId:
"dispatch-boundary",

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
dispatch.trusted,
false
);

assert.equal(
dispatch.dispatch[0]!.state,
"blocked"
);

assert.equal(
dispatch.blockedReasons.length,
1
);

}
);

test(
"preserves authorization provenance in dispatch",
() => {

const dispatch =
createLifecycleIntelligenceDispatch(
{
version:
"1.0.0",

objective:
"Provenance dispatch test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-governance",

authorization:
[
{
taskId:
"final-review",

state:
"authorized",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
dispatch.dispatch[0]!.reason,
"human verified"
);

}
);
