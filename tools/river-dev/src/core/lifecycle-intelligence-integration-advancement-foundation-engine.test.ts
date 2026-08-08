import test from "node:test";
import assert from "node:assert/strict";

import {
createLifecycleIntelligenceAdvancement
} from "./lifecycle-intelligence-integration-advancement-foundation-engine";

test(
"creates trusted advancement from trusted integration",
() => {

const advancement =
createLifecycleIntelligenceAdvancement({

version:
"1.0.0",

objective:
"test advancement",

trusted:
true,

source:
"test-integration",

integration:
[
{
taskId:
"task-001",

state:
"integrated",

reason:
"healthy integration"
}
],

blockedReasons:
[]

});

assert.equal(
advancement.trusted,
true
);

assert.equal(
advancement.advancement[0]!.taskId,
"task-001"
);

assert.equal(
advancement.advancement[0]!.state,
"advanced"
);

}
);

test(
"blocks advancement from blocked integration",
() => {

const advancement =
createLifecycleIntelligenceAdvancement({

version:
"1.0.0",

objective:
"blocked advancement",

trusted:
false,

source:
"test-integration",

integration:
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
advancement.trusted,
false
);

assert.equal(
advancement.advancement[0]!.state,
"blocked"
);

}
);

test(
"preserves integration provenance in advancement",
() => {

const advancement =
createLifecycleIntelligenceAdvancement({

version:
"1.0.0",

objective:
"provenance test",

trusted:
true,

source:
"integration-foundation",

integration:
[
{
taskId:
"task-003",

state:
"integrated",

reason:
"verified"
}
],

blockedReasons:
[]

});

assert.equal(
advancement.source,
"controlled-execution-lifecycle-intelligence-integration"
);

assert.equal(
advancement.advancement[0]!.reason,
"verified"
);

}
);
