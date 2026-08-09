import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionVerification
} from "./execution-verification-foundation-engine";

test(
"creates trusted verification from trusted assurance",
() => {

const verification =
createExecutionVerification({

version:
"1.0.0",

source:
"test",

objective:
"execute governed flow",

trusted:
true,

assuranceState:
[
"assurance completed"
],

provenance:
[
"verified"
],

evolutionState:
[
"controlled evolution maintained"
],

blockedReasons:
[]

});

assert.equal(
verification.trusted,
true
);

assert.equal(
verification.verificationState.length > 0,
true
);

}
);


test(
"blocks verification from untrusted assurance",
() => {

const verification =
createExecutionVerification({

version:
"1.0.0",

source:
"test",

objective:
"blocked flow",

trusted:
false,

assuranceState:
[
"assurance blocked"
],

provenance:
[
"preserved"
],

evolutionState:
[
"evolution boundary preserved"
],

blockedReasons:
[
"blocked"
]

});

assert.equal(
verification.trusted,
false
);

assert.equal(
verification.blockedReasons.length > 0,
true
);

}
);


test(
"preserves execution verification provenance",
() => {

const verification =
createExecutionVerification({

version:
"1.0.0",

source:
"test",

objective:
"provenance chain",

trusted:
true,

assuranceState:
[
"validated"
],

provenance:
[
"verified"
],

evolutionState:
[
"controlled evolution maintained"
],

blockedReasons:
[]

});

assert.equal(
verification.provenance.length > 0,
true
);

}
);

