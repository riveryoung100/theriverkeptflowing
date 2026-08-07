import assert from "node:assert/strict";
import test from "node:test";

import {
createExecutionChangeValidation
} from "./change-validation-engine";

test(
"creates valid validation from executable change plan",
() => {

const validation =
createExecutionChangeValidation(
{
version:
"1.0.0",

objective:
"Validation test",

executable:
true,

changes: [

{
taskId:
"task-1",

state:
"planned",

reason:
"change planned"
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
validation.validations[0]!.state,
"validated"
);

assert.equal(
validation.valid,
true
);

}
);

test(
"blocks validation from blocked change plan",
() => {

const validation =
createExecutionChangeValidation(
{
version:
"1.0.0",

objective:
"Blocked validation test",

executable:
false,

changes: [

{
taskId:
"task-1",

state:
"blocked",

reason:
"change blocked"
}

],

blockedReasons:
[
"change blocked"
]

}
);

assert.equal(
validation.valid,
false
);

assert.equal(
validation.validations[0]!.state,
"blocked"
);

assert.equal(
validation.blockedReasons.length,
1
);

}
);

test(
"requires confirmation for gated change plan",
() => {

const validation =
createExecutionChangeValidation(
{
version:
"1.0.0",

objective:
"Confirmation validation test",

executable:
false,

changes: [

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
validation.valid,
false
);

assert.equal(
validation.validations[0]!.state,
"confirmation-required"
);

}
);
