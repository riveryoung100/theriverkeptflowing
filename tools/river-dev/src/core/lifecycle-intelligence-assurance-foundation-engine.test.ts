import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligenceAssurance
} from "./lifecycle-intelligence-assurance-foundation-engine";

test(
"creates trusted assurance from trusted validation",
() => {

const assurance =
createLifecycleIntelligenceAssurance(
{
version:
"1.0.0",

objective:
"Assurance test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-validation",

validation:
[
{
taskId:
"validation-boundary",

state:
"validated",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
assurance.version,
"1.0.0"
);

assert.equal(
assurance.trusted,
true
);

assert.equal(
assurance.assurance[0]!.taskId,
"validation-boundary"
);

assert.equal(
assurance.assurance[0]!.state,
"assured"
);

assert.equal(
assurance.source,
"controlled-execution-lifecycle-intelligence-validation"
);

}
);

test(
"blocks assurance from blocked validation",
() => {

const assurance =
createLifecycleIntelligenceAssurance(
{
version:
"1.0.0",

objective:
"Blocked assurance test",

trusted:
false,

source:
"controlled-execution-lifecycle-intelligence-validation",

validation:
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
assurance.trusted,
false
);

assert.equal(
assurance.assurance[0]!.state,
"blocked"
);

assert.equal(
assurance.blockedReasons.length,
1
);

}
);

test(
"preserves validation provenance in assurance",
() => {

const assurance =
createLifecycleIntelligenceAssurance(
{
version:
"1.0.0",

objective:
"Provenance assurance test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-validation",

validation:
[
{
taskId:
"final-review",

state:
"validated",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
assurance.assurance[0]!.reason,
"human verified"
);

}
);
