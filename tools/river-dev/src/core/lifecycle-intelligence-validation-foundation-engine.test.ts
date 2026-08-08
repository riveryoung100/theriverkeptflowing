import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligenceValidation
} from "./lifecycle-intelligence-validation-foundation-engine";

test(
"creates trusted validation from trusted governance",
() => {

const validation =
createLifecycleIntelligenceValidation(
{
version:
"1.0.0",

objective:
"Validation test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-recommendation",

governance:
[
{
taskId:
"governance-boundary",

state:
"approved",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
validation.version,
"1.0.0"
);

assert.equal(
validation.trusted,
true
);

assert.equal(
validation.validation[0]!.taskId,
"governance-boundary"
);

assert.equal(
validation.validation[0]!.state,
"validated"
);

assert.equal(
validation.source,
"controlled-execution-lifecycle-intelligence-governance"
);

}
);

test(
"blocks validation from blocked governance",
() => {

const validation =
createLifecycleIntelligenceValidation(
{
version:
"1.0.0",

objective:
"Blocked validation test",

trusted:
false,

source:
"controlled-execution-lifecycle-intelligence-recommendation",

governance:
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
validation.trusted,
false
);

assert.equal(
validation.validation[0]!.state,
"blocked"
);

assert.equal(
validation.blockedReasons.length,
1
);

}
);

test(
"preserves governance provenance in validation",
() => {

const validation =
createLifecycleIntelligenceValidation(
{
version:
"1.0.0",

objective:
"Provenance validation test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-recommendation",

governance:
[
{
taskId:
"final-review",

state:
"approved",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
validation.validation[0]!.reason,
"human verified"
);

}
);
