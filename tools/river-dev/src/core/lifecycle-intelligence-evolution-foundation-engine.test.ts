import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligenceEvolution
} from "./lifecycle-intelligence-evolution-foundation-engine";

test(
"creates trusted evolution from trusted maturation",
() => {

const evolution =
createLifecycleIntelligenceEvolution(
{
version:
"1.0.0",

objective:
"Evolution test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-maturation",

maturation:
[
{
taskId:
"maturation-boundary",

state:
"matured",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
evolution.version,
"1.0.0"
);

assert.equal(
evolution.trusted,
true
);

assert.equal(
evolution.evolution[0]!.taskId,
"maturation-boundary"
);

assert.equal(
evolution.evolution[0]!.state,
"evolved"
);

assert.equal(
evolution.source,
"controlled-execution-lifecycle-intelligence-maturation"
);

}
);

test(
"blocks evolution from blocked maturation",
() => {

const evolution =
createLifecycleIntelligenceEvolution(
{
version:
"1.0.0",

objective:
"Blocked evolution test",

trusted:
false,

source:
"controlled-execution-lifecycle-intelligence-maturation",

maturation:
[
{
taskId:
"evolution-boundary",

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
evolution.trusted,
false
);

assert.equal(
evolution.evolution[0]!.state,
"blocked"
);

assert.equal(
evolution.blockedReasons.length,
1
);

}
);

test(
"preserves maturation provenance in evolution",
() => {

const evolution =
createLifecycleIntelligenceEvolution(
{
version:
"1.0.0",

objective:
"Provenance evolution test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-maturation",

maturation:
[
{
taskId:
"final-review",

state:
"matured",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
evolution.evolution[0]!.reason,
"human verified"
);

}
);
