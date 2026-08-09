import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionAuthorization
} from "./execution-authorization-foundation-engine";


test(
"creates trusted authorization from trusted decision",
() => {

const authorization =
createExecutionAuthorization({

version:
"1.0.0",

source:
"test",

objective:
"execute governed flow",

trusted:
true,

decisionState:
[
"decision accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});


assert.equal(
authorization.trusted,
true
);

assert.equal(
authorization.authorizationState.length > 0,
true
);

}
);


test(
"blocks authorization from untrusted decision",
() => {

const authorization =
createExecutionAuthorization({

version:
"1.0.0",

source:
"test",

objective:
"blocked flow",

trusted:
false,

decisionState:
[
"decision blocked"
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
authorization.trusted,
false
);

assert.equal(
authorization.blockedReasons.length > 0,
true
);

}
);


test(
"preserves execution authorization provenance",
() => {

const authorization =
createExecutionAuthorization({

version:
"1.0.0",

source:
"test",

objective:
"provenance chain",

trusted:
true,

decisionState:
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
authorization.provenance.length > 0,
true
);

}
);
