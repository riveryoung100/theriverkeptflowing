import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligenceAuthorization
} from "./lifecycle-intelligence-authorization-foundation-engine";

test(
"creates trusted authorization from trusted governance",
() => {

const authorization =
createLifecycleIntelligenceAuthorization(
{
version:
"1.0.0",

objective:
"Authorization test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-readiness",

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
authorization.version,
"1.0.0"
);

assert.equal(
authorization.trusted,
true
);

assert.equal(
authorization.authorization[0]!.taskId,
"governance-boundary"
);

assert.equal(
authorization.authorization[0]!.state,
"authorized"
);

assert.equal(
authorization.source,
"controlled-execution-lifecycle-intelligence-governance"
);

}
);


test(
"blocks authorization from blocked governance",
() => {

const authorization =
createLifecycleIntelligenceAuthorization(
{
version:
"1.0.0",

objective:
"Blocked authorization test",

trusted:
false,

source:
"controlled-execution-lifecycle-intelligence-readiness",

governance:
[
{
taskId:
"authorization-boundary",

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
authorization.trusted,
false
);

assert.equal(
authorization.authorization[0]!.state,
"blocked"
);

assert.equal(
authorization.blockedReasons.length,
1
);

}
);


test(
"preserves governance provenance in authorization",
() => {

const authorization =
createLifecycleIntelligenceAuthorization(
{
version:
"1.0.0",

objective:
"Provenance authorization test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-readiness",

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
authorization.authorization[0]!.reason,
"human verified"
);

}
);
