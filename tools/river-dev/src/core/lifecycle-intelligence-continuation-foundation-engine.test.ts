import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligenceContinuation
} from "./lifecycle-intelligence-continuation-foundation-engine";

test(
"creates trusted continuation from trusted evolution",
() => {

const continuation =
createLifecycleIntelligenceContinuation(
{
version:
"1.0.0",

objective:
"Continuation test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-evolution",

evolution:
[
{
taskId:
"evolution-boundary",

state:
"evolved",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
continuation.version,
"1.0.0"
);

assert.equal(
continuation.trusted,
true
);

assert.equal(
continuation.resilience[0]!.taskId,
"evolution-boundary"
);

assert.equal(
continuation.resilience[0]!.state,
"resilient"
);

assert.equal(
continuation.source,
"controlled-execution-lifecycle-intelligence-evolution"
);

}
);

test(
"blocks continuation from blocked evolution",
() => {

const continuation =
createLifecycleIntelligenceContinuation(
{
version:
"1.0.0",

objective:
"Blocked continuation test",

trusted:
false,

source:
"controlled-execution-lifecycle-intelligence-evolution",

evolution:
[
{
taskId:
"continuation-boundary",

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
continuation.trusted,
false
);

assert.equal(
continuation.resilience[0]!.state,
"blocked"
);

assert.equal(
continuation.blockedReasons.length,
1
);

}
);

test(
"preserves evolution provenance in continuation",
() => {

const continuation =
createLifecycleIntelligenceContinuation(
{
version:
"1.0.0",

objective:
"Provenance continuation test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-evolution",

evolution:
[
{
taskId:
"final-review",

state:
"evolved",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
continuation.resilience[0]!.reason,
"human verified"
);

}
);
