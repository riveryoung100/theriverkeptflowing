import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionCertification
} from "./execution-certification-foundation-engine";

test(
"creates trusted certification from trusted verification",
() => {

const certification =
createExecutionCertification({

version:
"1.0.0",

source:
"test",

objective:
"execute governed flow",

trusted:
true,

verificationState:
[
"verification completed"
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
"blocks certification from untrusted verification",
() => {

const certification =
createExecutionCertification({

version:
"1.0.0",

source:
"test",

objective:
"blocked flow",

trusted:
false,

verificationState:
[
"verification blocked"
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
"preserves execution certification provenance",
() => {

const certification =
createExecutionCertification({

version:
"1.0.0",

source:
"test",

objective:
"provenance chain",

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
