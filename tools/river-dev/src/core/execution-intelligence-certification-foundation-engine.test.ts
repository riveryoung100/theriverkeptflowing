import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceCertification
} from "./execution-intelligence-certification-foundation-engine";

test(
"creates trusted intelligence certification from trusted intelligence verification",
() => {

const certification =
createExecutionIntelligenceCertification({

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
certification.trusted,
true
);

assert.equal(
certification.certificationState.length > 0,
true
);

}
);


test(
"blocks intelligence certification from untrusted intelligence verification",
() => {

const certification =
createExecutionIntelligenceCertification({

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
certification.trusted,
false
);

assert.equal(
certification.blockedReasons.length > 0,
true
);

}
);


test(
"preserves execution intelligence certification provenance",
() => {

const certification =
createExecutionIntelligenceCertification({

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
certification.provenance.length > 0,
true
);

}
);
