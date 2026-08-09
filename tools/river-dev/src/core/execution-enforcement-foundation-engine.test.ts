import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionEnforcement
} from "./execution-enforcement-foundation-engine";


test(
"creates trusted enforcement from trusted approval",
() => {

const enforcement =
createExecutionEnforcement({

version:
"1.0.0",

source:
"test",

objective:
"execute governed flow",

trusted:
true,

approvalState:
[
"approval accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});


assert.equal(
enforcement.trusted,
true
);

assert.equal(
enforcement.enforcementState.length > 0,
true
);

}
);


test(
"blocks enforcement from untrusted approval",
() => {

const enforcement =
createExecutionEnforcement({

version:
"1.0.0",

source:
"test",

objective:
"blocked flow",

trusted:
false,

approvalState:
[
"approval blocked"
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
enforcement.trusted,
false
);

assert.equal(
enforcement.blockedReasons.length > 0,
true
);

}
);


test(
"preserves execution enforcement provenance",
() => {

const enforcement =
createExecutionEnforcement({

version:
"1.0.0",

source:
"test",

objective:
"provenance chain",

trusted:
true,

approvalState:
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
enforcement.provenance.length > 0,
true
);

}
);
