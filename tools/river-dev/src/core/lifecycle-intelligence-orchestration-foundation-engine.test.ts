import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligenceOrchestration
} from "./lifecycle-intelligence-orchestration-foundation-engine";

test(
"creates trusted orchestration from trusted intelligence",
() => {

const orchestration =
createLifecycleIntelligenceOrchestration(
{
version:
"1.0.0",

objective:
"Orchestration test",

trusted:
true,

source:
"controlled-execution-lifecycle",

optimization:
[
{
taskId:
"intelligence-boundary",

state:
"optimized",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
orchestration.version,
"1.0.0"
);

assert.equal(
orchestration.trusted,
true
);

assert.equal(
orchestration.orchestration[0]!.taskId,
"intelligence-boundary"
);

assert.equal(
orchestration.orchestration[0]!.state,
"orchestrated"
);

assert.equal(
orchestration.source,
"controlled-execution-lifecycle-intelligence-optimization"
);

}
);


test(
"blocks orchestration from blocked intelligence",
() => {

const orchestration =
createLifecycleIntelligenceOrchestration(
{
version:
"1.0.0",

objective:
"Blocked orchestration test",

trusted:
false,

source:
"controlled-execution-lifecycle",

optimization:
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
orchestration.trusted,
false
);

assert.equal(
orchestration.orchestration[0]!.state,
"blocked"
);

assert.equal(
orchestration.blockedReasons.length,
1
);

}
);


test(
"preserves intelligence provenance in orchestration",
() => {

const orchestration =
createLifecycleIntelligenceOrchestration(
{
version:
"1.0.0",

objective:
"Provenance orchestration test",

trusted:
true,

source:
"controlled-execution-lifecycle",

optimization:
[
{
taskId:
"final-review",

state:
"optimized",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
orchestration.orchestration[0]!.reason,
"human verified"
);

}
);
