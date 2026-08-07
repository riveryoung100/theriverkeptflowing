import assert from "node:assert/strict";
import test from "node:test";

import {
createExecutionPolicy
} from "./policy-engine";

test(
"creates allowed policy from approved governance",
() => {

const policy =
createExecutionPolicy(
{
version:
"1.0.0",

objective:
"Policy test",

approved:
true,

decisions: [

{
taskId:
"task-1",

state:
"approved",

reason:
"governance approved"
}

],

blockedReasons:
[]

}
);

assert.equal(
policy.version,
"1.0.0"
);

assert.equal(
policy.policies[0]!.state,
"allowed"
);

assert.equal(
policy.allowed,
true
);

}
);

test(
"blocks policy from blocked governance",
() => {

const policy =
createExecutionPolicy(
{
version:
"1.0.0",

objective:
"Blocked policy test",

approved:
false,

decisions: [

{
taskId:
"task-1",

state:
"blocked",

reason:
"governance blocked"
}

],

blockedReasons:
[
"governance blocked"
]

}
);

assert.equal(
policy.allowed,
false
);

assert.equal(
policy.policies[0]!.state,
"blocked"
);

assert.equal(
policy.blockedReasons.length,
1
);

}
);

test(
"requires review for review-required governance",
() => {

const policy =
createExecutionPolicy(
{
version:
"1.0.0",

objective:
"Review policy test",

approved:
false,

decisions: [

{
taskId:
"task-1",

state:
"review-required",

reason:
"awaiting review"
}

],

blockedReasons:
[]

}
);

assert.equal(
policy.allowed,
false
);

assert.equal(
policy.policies[0]!.state,
"review-required"
);

}
);
