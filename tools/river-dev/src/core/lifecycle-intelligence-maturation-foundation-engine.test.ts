import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligenceMaturation
} from "./lifecycle-intelligence-maturation-foundation-engine";

test(
"creates trusted maturation from trusted advancement",
() => {

const maturation =
createLifecycleIntelligenceMaturation(
{
version:
"1.0.0",

objective:
"Maturation test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-advancement",

advancement:
[
{
taskId:
"advancement-boundary",

state:
"advanced",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
maturation.version,
"1.0.0"
);

assert.equal(
maturation.trusted,
true
);

assert.equal(
maturation.maturation[0]!.taskId,
"advancement-boundary"
);

assert.equal(
maturation.maturation[0]!.state,
"matured"
);

assert.equal(
maturation.source,
"controlled-execution-lifecycle-intelligence-advancement"
);

}
);


test(
"blocks maturation from blocked advancement",
() => {

const maturation =
createLifecycleIntelligenceMaturation(
{
version:
"1.0.0",

objective:
"Blocked maturation test",

trusted:
false,

source:
"controlled-execution-lifecycle-intelligence-advancement",

advancement:
[
{
taskId:
"maturation-boundary",

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
maturation.trusted,
false
);

assert.equal(
maturation.maturation[0]!.state,
"blocked"
);

assert.equal(
maturation.blockedReasons.length,
1
);

}
);


test(
"preserves advancement provenance in maturation",
() => {

const maturation =
createLifecycleIntelligenceMaturation(
{
version:
"1.0.0",

objective:
"Provenance maturation test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-advancement",

advancement:
[
{
taskId:
"final-review",

state:
"advanced",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
maturation.maturation[0]!.reason,
"human verified"
);

}
);
