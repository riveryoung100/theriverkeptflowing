import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligenceIntegration
} from "./lifecycle-intelligence-integration-foundation-engine";

test(
"creates trusted integration from trusted synchronization",
() => {

const integration =
createLifecycleIntelligenceIntegration(
{
version:
"1.0.0",

objective:
"Integration test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-synchronization",

synchronization:
[
{
taskId:
"synchronization-boundary",

state:
"synchronized",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
integration.version,
"1.0.0"
);

assert.equal(
integration.trusted,
true
);

assert.equal(
integration.integration[0]!.taskId,
"synchronization-boundary"
);

assert.equal(
integration.integration[0]!.state,
"integrated"
);

assert.equal(
integration.source,
"controlled-execution-lifecycle-intelligence-synchronization"
);

}
);

test(
"blocks integration from blocked synchronization",
() => {

const integration =
createLifecycleIntelligenceIntegration(
{
version:
"1.0.0",

objective:
"Blocked integration test",

trusted:
false,

source:
"controlled-execution-lifecycle-intelligence-synchronization",

synchronization:
[
{
taskId:
"integration-boundary",

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
integration.trusted,
false
);

assert.equal(
integration.integration[0]!.state,
"blocked"
);

assert.equal(
integration.blockedReasons.length,
1
);

}
);

test(
"preserves synchronization provenance in integration",
() => {

const integration =
createLifecycleIntelligenceIntegration(
{
version:
"1.0.0",

objective:
"Provenance integration test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-synchronization",

synchronization:
[
{
taskId:
"final-review",

state:
"synchronized",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
integration.integration[0]!.reason,
"human verified"
);

}
);
