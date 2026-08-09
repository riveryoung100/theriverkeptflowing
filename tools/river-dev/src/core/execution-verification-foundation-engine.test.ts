import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionVerification
} from "./execution-verification-foundation-engine";


test(
"creates trusted verification from trusted deployment",
() => {

const verification =
createExecutionVerification({

version:
"1.0.0",

source:
"test",

objective:
"execute repository change",

trusted:
true,

deploymentState:
[
"deployment accepted"
],

provenance:
[
"deployment verified"
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

});


test(
"blocks verification from untrusted deployment",
() => {

const verification =
createExecutionVerification({

version:
"1.0.0",

source:
"test",

objective:
"execute repository change",

trusted:
false,

deploymentState:
[
"deployment blocked"
],

provenance:
[
"deployment preserved"
],

blockedReasons:
[
"deployment not trusted"
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

});


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
"validate verification chain",

trusted:
true,

deploymentState:
[
"validated"
],

provenance:
[
"deployment verified"
],

blockedReasons:
[]

});


assert.equal(
verification.provenance.length > 0,
true
);

});
