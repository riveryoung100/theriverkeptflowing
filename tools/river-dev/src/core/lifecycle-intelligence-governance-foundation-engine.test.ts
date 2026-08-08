import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligenceGovernance
} from "./lifecycle-intelligence-governance-foundation-engine";

test(
"creates trusted governance from trusted recommendation",
() => {

const governance =
createLifecycleIntelligenceGovernance(
{
version:
"1.0.0",

objective:
"Governance test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-insight",

recommendation:
[
{
taskId:
"recommendation-boundary",

state:
"recommended",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
governance.version,
"1.0.0"
);

assert.equal(
governance.trusted,
true
);

assert.equal(
governance.governance[0]!.taskId,
"recommendation-boundary"
);

assert.equal(
governance.governance[0]!.state,
"approved"
);

assert.equal(
governance.source,
"controlled-execution-lifecycle-intelligence-recommendation"
);

}
);

test(
"blocks governance from blocked recommendation",
() => {

const governance =
createLifecycleIntelligenceGovernance(
{
version:
"1.0.0",

objective:
"Blocked governance test",

trusted:
false,

source:
"controlled-execution-lifecycle-intelligence-insight",

recommendation:
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
governance.trusted,
false
);

assert.equal(
governance.governance[0]!.state,
"blocked"
);

assert.equal(
governance.blockedReasons.length,
1
);

}
);

test(
"preserves recommendation provenance in governance",
() => {

const governance =
createLifecycleIntelligenceGovernance(
{
version:
"1.0.0",

objective:
"Provenance governance test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-insight",

recommendation:
[
{
taskId:
"final-review",

state:
"recommended",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
governance.governance[0]!.reason,
"human verified"
);

}
);
