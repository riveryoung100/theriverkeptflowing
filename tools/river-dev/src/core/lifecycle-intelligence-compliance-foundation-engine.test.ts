import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligenceCompliance
} from "./lifecycle-intelligence-compliance-foundation-engine";

test(
"creates trusted compliance from trusted assurance",
() => {

const compliance =
createLifecycleIntelligenceCompliance(
{
version:
"1.0.0",

objective:
"Compliance test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-validation",

assurance:
[
{
taskId:
"assurance-boundary",

state:
"assured",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
compliance.version,
"1.0.0"
);

assert.equal(
compliance.trusted,
true
);

assert.equal(
compliance.compliance[0]!.taskId,
"assurance-boundary"
);

assert.equal(
compliance.compliance[0]!.state,
"compliant"
);

assert.equal(
compliance.source,
"controlled-execution-lifecycle-intelligence-assurance"
);

}
);

test(
"blocks compliance from blocked assurance",
() => {

const compliance =
createLifecycleIntelligenceCompliance(
{
version:
"1.0.0",

objective:
"Blocked compliance test",

trusted:
false,

source:
"controlled-execution-lifecycle-intelligence-validation",

assurance:
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
compliance.trusted,
false
);

assert.equal(
compliance.compliance[0]!.state,
"blocked"
);

assert.equal(
compliance.blockedReasons.length,
1
);

}
);

test(
"preserves assurance provenance in compliance",
() => {

const compliance =
createLifecycleIntelligenceCompliance(
{
version:
"1.0.0",

objective:
"Provenance compliance test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-validation",

assurance:
[
{
taskId:
"final-review",

state:
"assured",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
compliance.compliance[0]!.reason,
"human verified"
);

}
);
