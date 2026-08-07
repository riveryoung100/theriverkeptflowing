import assert from "node:assert/strict";
import test from "node:test";

import {
createExecutionFinalGate
} from "./final-gate-engine";

test(
"creates permitted final gate from authorized run",
() => {

const gate =
createExecutionFinalGate(
{
version:
"1.0.0",

objective:
"Final gate test",

authorized:
true,

authorization: [

{
taskId:
"task-1",

state:
"authorized",

reason:
"run authorized"
}

],

blockedReasons:
[]

}
);

assert.equal(
gate.version,
"1.0.0"
);

assert.equal(
gate.gates[0]!.state,
"approved"
);

assert.equal(
gate.permitted,
true
);

}
);

test(
"blocks final gate from blocked authorization",
() => {

const gate =
createExecutionFinalGate(
{
version:
"1.0.0",

objective:
"Blocked final gate test",

authorized:
false,

authorization: [

{
taskId:
"task-1",

state:
"blocked",

reason:
"authorization blocked"
}

],

blockedReasons:
[
"authorization blocked"
]

}
);

assert.equal(
gate.permitted,
false
);

assert.equal(
gate.gates[0]!.state,
"blocked"
);

assert.equal(
gate.blockedReasons.length,
1
);

}
);

test(
"requires confirmation for gated authorization",
() => {

const gate =
createExecutionFinalGate(
{
version:
"1.0.0",

objective:
"Confirmation final gate test",

authorized:
false,

authorization: [

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
gate.permitted,
false
);

assert.equal(
gate.gates[0]!.state,
"confirmation-required"
);

}
);
