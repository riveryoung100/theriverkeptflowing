import test from "node:test";
import assert from "node:assert/strict";

import {
createLifecycleIntelligenceResilience
} from "./lifecycle-intelligence-resilience-foundation-engine";

test(
"creates trusted resilience from trusted reliability",
() => {

const resilience =
createLifecycleIntelligenceResilience({

version:
"1.0.0",

objective:
"test resilience",

trusted:
true,

source:
"test-reliability",

reliability:
[
{
taskId:
"task-001",

state:
"reliable",

reason:
"healthy lifecycle capability"
}
],

blockedReasons:
[]

});

assert.equal(
resilience.trusted,
true
);

assert.equal(
resilience.resilience[0]!.taskId,
"task-001"
);

assert.equal(
resilience.resilience[0]!.state,
"resilient"
);

}
);


test(
"blocks resilience from blocked reliability",
() => {

const resilience =
createLifecycleIntelligenceResilience({

version:
"1.0.0",

objective:
"blocked resilience",

trusted:
false,

source:
"test-reliability",

reliability:
[
{
taskId:
"task-002",

state:
"blocked",

reason:
"blocked dependency"
}
],

blockedReasons:
[
"blocked dependency"
]

});

assert.equal(
resilience.trusted,
false
);

assert.equal(
resilience.resilience[0]!.state,
"blocked"
);

}
);


test(
"preserves reliability provenance in resilience",
() => {

const resilience =
createLifecycleIntelligenceResilience({

version:
"1.0.0",

objective:
"provenance test",

trusted:
true,

source:
"reliability-foundation",

reliability:
[
{
taskId:
"task-003",

state:
"reliable",

reason:
"verified"
}
],

blockedReasons:
[]

});

assert.equal(
resilience.source,
"controlled-execution-lifecycle-intelligence-reliability"
);

assert.equal(
resilience.resilience[0]!.reason,
"verified"
);

}
);
