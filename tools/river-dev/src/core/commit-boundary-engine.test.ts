import assert from "node:assert/strict";
import test from "node:test";

import {
createCommitBoundary
} from "./commit-boundary-engine";

test(
"creates permitted commit boundary from approved final gate",
() => {

const boundary =
createCommitBoundary(
{
version:
"1.0.0",

objective:
"Commit boundary test",

permitted:
true,

gates: [

{
taskId:
"task-1",

state:
"approved",

reason:
"final gate approved"

}

],

blockedReasons:
[]

}
);

assert.equal(
boundary.version,
"1.0.0"
);

assert.equal(
boundary.commits[0]!.state,
"authorized"
);

assert.equal(
boundary.permitted,
true
);

}
);


test(
"blocks commit boundary from blocked final gate",
() => {

const boundary =
createCommitBoundary(
{
version:
"1.0.0",

objective:
"Blocked commit boundary test",

permitted:
false,

gates: [

{
taskId:
"task-1",

state:
"blocked",

reason:
"final gate blocked"

}

],

blockedReasons:
[
"final gate blocked"
]

}
);

assert.equal(
boundary.permitted,
false
);

assert.equal(
boundary.commits[0]!.state,
"blocked"
);

assert.equal(
boundary.blockedReasons.length,
1
);

}
);


test(
"requires confirmation for gated final gate",
() => {

const boundary =
createCommitBoundary(
{
version:
"1.0.0",

objective:
"Confirmation commit boundary test",

permitted:
false,

gates: [

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
boundary.permitted,
false
);

assert.equal(
boundary.commits[0]!.state,
"confirmation-required"
);

}
);
