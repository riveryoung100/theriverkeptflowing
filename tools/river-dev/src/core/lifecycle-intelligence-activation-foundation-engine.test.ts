import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligenceActivation
} from "./lifecycle-intelligence-activation-foundation-engine";

test(
"creates trusted activation from trusted restoration",
() => {

const activation =
createLifecycleIntelligenceActivation(
{
version:
"1.0.0",

objective:
"Activation test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-recovery",

restoration:
[
{
taskId:
"restoration-boundary",

state:
"restored",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
activation.version,
"1.0.0"
);

assert.equal(
activation.trusted,
true
);

assert.equal(
activation.activation[0]!.taskId,
"restoration-boundary"
);

assert.equal(
activation.activation[0]!.state,
"activated"
);

assert.equal(
activation.source,
"controlled-execution-lifecycle-intelligence-restoration"
);

}
);


test(
"blocks activation from blocked restoration",
() => {

const activation =
createLifecycleIntelligenceActivation(
{
version:
"1.0.0",

objective:
"Blocked activation test",

trusted:
false,

source:
"controlled-execution-lifecycle-intelligence-recovery",

restoration:
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
activation.trusted,
false
);

assert.equal(
activation.activation[0]!.state,
"blocked"
);

assert.equal(
activation.blockedReasons.length,
1
);

}
);


test(
"preserves restoration provenance in activation",
() => {

const activation =
createLifecycleIntelligenceActivation(
{
version:
"1.0.0",

objective:
"Provenance activation test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-recovery",

restoration:
[
{
taskId:
"final-review",

state:
"restored",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
activation.activation[0]!.reason,
"human verified"
);

}
);
