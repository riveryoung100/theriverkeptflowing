import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceValidation
} from "./execution-intelligence-validation-foundation-engine";

test(
"creates trusted intelligence validation from trusted intelligence verification",
() => {

const validation =
createExecutionIntelligenceValidation({

version:
"1.0.0",

source:
"test",

objective:
"Build capability",

trusted:
true,

verificationState:
[
"intelligence verification accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
validation.trusted,
true
);

assert.equal(
validation.validationState.length > 0,
true
);

}
);

test(
"blocks intelligence validation from untrusted intelligence verification",
() => {

const validation =
createExecutionIntelligenceValidation({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe capability",

trusted:
false,

verificationState:
[
"intelligence verification blocked"
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
validation.trusted,
false
);

assert.equal(
validation.blockedReasons.length > 0,
true
);

}
);

test(
"preserves execution intelligence validation provenance",
() => {

const validation =
createExecutionIntelligenceValidation({

version:
"1.0.0",

source:
"test",

objective:
"Provenance test",

trusted:
true,

verificationState:
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
validation.provenance.length > 0,
true
);

}
);
