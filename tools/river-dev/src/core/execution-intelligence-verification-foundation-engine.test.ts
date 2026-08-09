import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceVerification
} from "./execution-intelligence-verification-foundation-engine";

test(
"creates trusted intelligence verification from trusted intelligence assurance",
() => {

const verification =
createExecutionIntelligenceVerification({

version:
"1.0.0",

source:
"test",

objective:
"Build capability",

trusted:
true,

assuranceState:
[
"intelligence assurance accepted"
],

provenance:
[
"verified"
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
"blocks intelligence verification from untrusted intelligence assurance",
() => {

const verification =
createExecutionIntelligenceVerification({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe capability",

trusted:
false,

assuranceState:
[
"intelligence assurance blocked"
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
"preserves execution intelligence verification provenance",
() => {

const verification =
createExecutionIntelligenceVerification({

version:
"1.0.0",

source:
"test",

objective:
"Provenance test",

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

blockedReasons:
[]

});

assert.equal(
verification.provenance.length > 0,
true
);

}
);
