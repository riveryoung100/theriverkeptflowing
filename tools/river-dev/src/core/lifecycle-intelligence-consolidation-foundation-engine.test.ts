import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligenceConsolidation
} from "./lifecycle-intelligence-consolidation-foundation-engine";

test(
"creates trusted consolidation from trusted integration",
() => {

const consolidation =
createLifecycleIntelligenceConsolidation(
{
version:
"1.0.0",

objective:
"Consolidation test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-integration",

integration:
[
{
taskId:
"integration-boundary",

state:
"integrated",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
consolidation.version,
"1.0.0"
);

assert.equal(
consolidation.trusted,
true
);

assert.equal(
consolidation.consolidation[0]!.taskId,
"integration-boundary"
);

assert.equal(
consolidation.consolidation[0]!.state,
"consolidated"
);

assert.equal(
consolidation.source,
"controlled-execution-lifecycle-intelligence-integration"
);

}
);

test(
"blocks consolidation from blocked integration",
() => {

const consolidation =
createLifecycleIntelligenceConsolidation(
{
version:
"1.0.0",

objective:
"Blocked consolidation test",

trusted:
false,

source:
"controlled-execution-lifecycle-intelligence-integration",

integration:
[
{
taskId:
"consolidation-boundary",

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
consolidation.trusted,
false
);

assert.equal(
consolidation.consolidation[0]!.state,
"blocked"
);

assert.equal(
consolidation.blockedReasons.length,
1
);

}
);

test(
"preserves integration provenance in consolidation",
() => {

const consolidation =
createLifecycleIntelligenceConsolidation(
{
version:
"1.0.0",

objective:
"Provenance consolidation test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-integration",

integration:
[
{
taskId:
"final-review",

state:
"integrated",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
consolidation.consolidation[0]!.reason,
"human verified"
);

}
);
