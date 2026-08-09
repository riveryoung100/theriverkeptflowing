import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionApproval
} from "./execution-approval-foundation-engine";


test(
"creates trusted approval from trusted authorization",
() => {

const approval =
createExecutionApproval({

version:
"1.0.0",

source:
"test",

objective:
"execute governed flow",

trusted:
true,

authorizationState:
[
"authorization accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});


assert.equal(
approval.trusted,
true
);

assert.equal(
approval.approvalState.length > 0,
true
);

}
);


test(
"blocks approval from untrusted authorization",
() => {

const approval =
createExecutionApproval({

version:
"1.0.0",

source:
"test",

objective:
"blocked flow",

trusted:
false,

authorizationState:
[
"authorization blocked"
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
approval.trusted,
false
);

assert.equal(
approval.blockedReasons.length > 0,
true
);

}
);


test(
"preserves execution approval provenance",
() => {

const approval =
createExecutionApproval({

version:
"1.0.0",

source:
"test",

objective:
"provenance chain",

trusted:
true,

authorizationState:
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
approval.provenance.length > 0,
true
);

}
);
