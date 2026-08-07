import assert from "node:assert/strict";
import test from "node:test";

import {
createRunAuthorization
} from "./run-authorization-engine";

test(
"creates authorized run from ready execution readiness",
() => {

const authorization =
createRunAuthorization(
{
version:
"1.0.0",

objective:
"Authorization test",

ready:
true,

readiness: [

{
taskId:
"task-1",

state:
"ready",

reason:
"readiness approved"

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
authorization.authorization[0]!.state,
"authorized"
);

assert.equal(
authorization.authorized,
true
);

}
);

test(
"blocks run authorization from blocked readiness",
() => {

const authorization =
createRunAuthorization(
{
version:
"1.0.0",

objective:
"Blocked authorization test",

ready:
false,

readiness: [

{
taskId:
"task-1",

state:
"blocked",

reason:
"readiness blocked"

}

],

blockedReasons:
[
"readiness blocked"
]

}
);

assert.equal(
authorization.authorized,
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
"requires confirmation for gated readiness",
() => {

const authorization =
createRunAuthorization(
{
version:
"1.0.0",

objective:
"Confirmation authorization test",

ready:
false,

readiness: [

{
taskId:
"task-1",

state:
"confirmation-required",

reason:
"awaiting confirmation"

}

],

blockedReasons:
[]

}
);

assert.equal(
authorization.authorized,
false
);

assert.equal(
authorization.authorization[0]!.state,
"confirmation-required"
);

}
);
