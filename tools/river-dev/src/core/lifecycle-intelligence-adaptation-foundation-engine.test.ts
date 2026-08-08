import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligenceAdaptation
} from "./lifecycle-intelligence-adaptation-foundation-engine";

test(
"creates trusted adaptation from trusted feedback",
() => {

const adaptation =
createLifecycleIntelligenceAdaptation(
{
version:
"1.0.0",

objective:
"Adaptation test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-execution",

feedback:
[
{
taskId:
"feedback-boundary",

state:
"learned",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
adaptation.version,
"1.0.0"
);

assert.equal(
adaptation.trusted,
true
);

assert.equal(
adaptation.adaptation[0]!.taskId,
"feedback-boundary"
);

assert.equal(
adaptation.adaptation[0]!.state,
"adapted"
);

assert.equal(
adaptation.source,
"controlled-execution-lifecycle-intelligence-feedback"
);

}
);

test(
"blocks adaptation from blocked feedback",
() => {

const adaptation =
createLifecycleIntelligenceAdaptation(
{
version:
"1.0.0",

objective:
"Blocked adaptation test",

trusted:
false,

source:
"controlled-execution-lifecycle-intelligence-execution",

feedback:
[
{
taskId:
"adaptation-boundary",

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
adaptation.trusted,
false
);

assert.equal(
adaptation.adaptation[0]!.state,
"blocked"
);

assert.equal(
adaptation.blockedReasons.length,
1
);

}
);

test(
"preserves feedback provenance in adaptation",
() => {

const adaptation =
createLifecycleIntelligenceAdaptation(
{
version:
"1.0.0",

objective:
"Provenance adaptation test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-execution",

feedback:
[
{
taskId:
"final-review",

state:
"learned",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
adaptation.adaptation[0]!.reason,
"human verified"
);

}
);
