import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligenceSynchronization
} from "./lifecycle-intelligence-synchronization-foundation-engine";

test(
"creates trusted synchronization from trusted coordination",
() => {

const synchronization =
createLifecycleIntelligenceSynchronization(
{
version:
"1.0.0",

objective:
"Synchronization test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-coordination",

coordination:
[
{
taskId:
"coordination-boundary",

state:
"coordinated",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
synchronization.version,
"1.0.0"
);

assert.equal(
synchronization.trusted,
true
);

assert.equal(
synchronization.synchronization[0]!.taskId,
"coordination-boundary"
);

assert.equal(
synchronization.synchronization[0]!.state,
"synchronized"
);

assert.equal(
synchronization.source,
"controlled-execution-lifecycle-intelligence-coordination"
);

}
);


test(
"blocks synchronization from blocked coordination",
() => {

const synchronization =
createLifecycleIntelligenceSynchronization(
{
version:
"1.0.0",

objective:
"Blocked synchronization test",

trusted:
false,

source:
"controlled-execution-lifecycle-intelligence-coordination",

coordination:
[
{
taskId:
"synchronization-boundary",

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
synchronization.trusted,
false
);

assert.equal(
synchronization.synchronization[0]!.state,
"blocked"
);

assert.equal(
synchronization.blockedReasons.length,
1
);

}
);


test(
"preserves coordination provenance in synchronization",
() => {

const synchronization =
createLifecycleIntelligenceSynchronization(
{
version:
"1.0.0",

objective:
"Provenance synchronization test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-coordination",

coordination:
[
{
taskId:
"final-review",

state:
"coordinated",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
synchronization.synchronization[0]!.reason,
"human verified"
);

}
);
