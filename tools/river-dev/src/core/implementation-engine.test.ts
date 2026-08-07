import assert from "node:assert/strict";
import test from "node:test";

import {
createExecutionImplementation
} from "./implementation-engine";


test(
"creates ready implementation from authorized execution",
() => {

const implementation =
createExecutionImplementation(
{
version:
"1.0.0",

objective:
"Implementation test",

authorized:
true,

authorizations: [

{
taskId:
"task-1",

state:
"authorized",

reason:
"authorization granted"
}

],

blockedReasons:
[]

}
);


assert.equal(
implementation.version,
"1.0.0"
);

assert.equal(
implementation.implementations[0]!.state,
"ready"
);

assert.equal(
implementation.ready,
true
);

}
);


test(
"blocks implementation from blocked authorization",
() => {

const implementation =
createExecutionImplementation(
{
version:
"1.0.0",

objective:
"Blocked implementation test",

authorized:
false,

authorizations: [

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
implementation.ready,
false
);

assert.equal(
implementation.implementations[0]!.state,
"blocked"
);

assert.equal(
implementation.blockedReasons.length,
1
);

}
);


test(
"requires confirmation for gated authorization",
() => {

const implementation =
createExecutionImplementation(
{
version:
"1.0.0",

objective:
"Confirmation implementation test",

authorized:
false,

authorizations: [

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
implementation.ready,
false
);

assert.equal(
implementation.implementations[0]!.state,
"confirmation-required"
);

}
);
