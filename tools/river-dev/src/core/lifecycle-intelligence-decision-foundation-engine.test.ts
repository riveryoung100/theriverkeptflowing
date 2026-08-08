import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligenceDecision
} from "./lifecycle-intelligence-decision-foundation-engine";

test(
"creates trusted decision from trusted orchestration",
() => {

const decision =
createLifecycleIntelligenceDecision(
{
version:
"1.0.0",

objective:
"Decision test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence",

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
decision.version,
"1.0.0"
);

assert.equal(
decision.trusted,
true
);

assert.equal(
decision.decision[0]!.taskId,
"orchestration-boundary"
);

assert.equal(
decision.decision[0]!.state,
"decided"
);

assert.equal(
decision.source,
"controlled-execution-lifecycle-intelligence-orchestration"
);

}
);

test(
"blocks decision from blocked orchestration",
() => {

const decision =
createLifecycleIntelligenceDecision(
{
version:
"1.0.0",

objective:
"Blocked decision test",

trusted:
false,

source:
"controlled-execution-lifecycle-intelligence",

orchestration:
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
decision.trusted,
false
);

assert.equal(
decision.decision[0]!.state,
"blocked"
);

assert.equal(
decision.blockedReasons.length,
1
);

}
);

test(
"preserves orchestration provenance in decision",
() => {

const decision =
createLifecycleIntelligenceDecision(
{
version:
"1.0.0",

objective:
"Provenance decision test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence",

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
decision.decision[0]!.reason,
"human verified"
);

}
);
