import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligenceCoordination
} from "./lifecycle-intelligence-coordination-foundation-engine";

test(
"creates trusted coordination from trusted orchestration",
() => {

const coordination =
createLifecycleIntelligenceCoordination(
{
version:
"1.0.0",

objective:
"Coordination test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-optimization",

orchestration:
[
{
taskId:
"orchestration-boundary",

state:
"orchestrated",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
coordination.version,
"1.0.0"
);

assert.equal(
coordination.trusted,
true
);

assert.equal(
coordination.coordination[0]!.taskId,
"orchestration-boundary"
);

assert.equal(
coordination.coordination[0]!.state,
"coordinated"
);

assert.equal(
coordination.source,
"controlled-execution-lifecycle-intelligence-orchestration"
);

}
);

test(
"blocks coordination from blocked orchestration",
() => {

const coordination =
createLifecycleIntelligenceCoordination(
{
version:
"1.0.0",

objective:
"Blocked coordination test",

trusted:
false,

source:
"controlled-execution-lifecycle-intelligence-optimization",

orchestration:
[
{
taskId:
"coordination-boundary",

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
coordination.trusted,
false
);

assert.equal(
coordination.coordination[0]!.state,
"blocked"
);

assert.equal(
coordination.blockedReasons.length,
1
);

}
);

test(
"preserves orchestration provenance in coordination",
() => {

const coordination =
createLifecycleIntelligenceCoordination(
{
version:
"1.0.0",

objective:
"Provenance coordination test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-optimization",

orchestration:
[
{
taskId:
"final-review",

state:
"orchestrated",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
coordination.coordination[0]!.reason,
"human verified"
);

}
);
