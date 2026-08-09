import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionAction
} from "./execution-action-foundation-engine";

test(
"creates trusted action from trusted enforcement",
() => {

const action =
createExecutionAction({

version:
"1.0.0",

source:
"test",

objective:
"execute governed flow",

trusted:
true,

enforcementState:
[
"enforcement accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
action.trusted,
true
);

assert.equal(
action.actionState.length > 0,
true
);

}
);


test(
"blocks action from untrusted enforcement",
() => {

const action =
createExecutionAction({

version:
"1.0.0",

source:
"test",

objective:
"blocked flow",

trusted:
false,

enforcementState:
[
"enforcement blocked"
],

provenance:
[
"preserved"
],

blockedReasons:
[
"blocked"
]

});

assert.equal(
action.trusted,
false
);

assert.equal(
action.blockedReasons.length > 0,
true
);

}
);


test(
"preserves execution action provenance",
() => {

const action =
createExecutionAction({

version:
"1.0.0",

source:
"test",

objective:
"provenance chain",

trusted:
true,

enforcementState:
[
"validated"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
action.provenance.length > 0,
true
);

}
);
