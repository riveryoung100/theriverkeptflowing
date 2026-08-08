import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligenceOptimization
} from "./lifecycle-intelligence-optimization-foundation-engine";

test(
"creates trusted optimization from trusted adaptation",
() => {

const optimization =
createLifecycleIntelligenceOptimization(
{
version:
"1.0.0",

objective:
"Optimization test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-feedback",

adaptation:
[
{
taskId:
"adaptation-boundary",

state:
"adapted",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
optimization.version,
"1.0.0"
);

assert.equal(
optimization.trusted,
true
);

assert.equal(
optimization.optimization[0]!.taskId,
"adaptation-boundary"
);

assert.equal(
optimization.optimization[0]!.state,
"optimized"
);

assert.equal(
optimization.source,
"controlled-execution-lifecycle-intelligence-adaptation"
);

}
);

test(
"blocks optimization from blocked adaptation",
() => {

const optimization =
createLifecycleIntelligenceOptimization(
{
version:
"1.0.0",

objective:
"Blocked optimization test",

trusted:
false,

source:
"controlled-execution-lifecycle-intelligence-feedback",

adaptation:
[
{
taskId:
"optimization-boundary",

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
optimization.trusted,
false
);

assert.equal(
optimization.optimization[0]!.state,
"blocked"
);

assert.equal(
optimization.blockedReasons.length,
1
);

}
);

test(
"preserves adaptation provenance in optimization",
() => {

const optimization =
createLifecycleIntelligenceOptimization(
{
version:
"1.0.0",

objective:
"Provenance optimization test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-feedback",

adaptation:
[
{
taskId:
"final-review",

state:
"adapted",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
optimization.optimization[0]!.reason,
"human verified"
);

}
);
