import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionObservation
} from "./execution-observation-foundation-engine";

test(
"creates trusted observation from trusted verification",
() => {

const observation =
createExecutionObservation({

version:
"1.0.0",

source:
"test",

objective:
"execute repository change",

trusted:
true,

verificationState:
[
"verification accepted"
],

provenance:
[
"verification verified"
],

blockedReasons:
[]

});

assert.equal(
observation.trusted,
true
);

assert.equal(
observation.observationState.length > 0,
true
);

});

test(
"blocks observation from untrusted verification",
() => {

const observation =
createExecutionObservation({

version:
"1.0.0",

source:
"test",

objective:
"execute repository change",

trusted:
false,

verificationState:
[
"verification blocked"
],

provenance:
[
"verification preserved"
],

blockedReasons:
[
"verification not trusted"
]

});

assert.equal(
observation.trusted,
false
);

assert.equal(
observation.blockedReasons.length > 0,
true
);

});

test(
"preserves execution observation provenance",
() => {

const observation =
createExecutionObservation({

version:
"1.0.0",

source:
"test",

objective:
"validate observation chain",

trusted:
true,

verificationState:
[
"validated"
],

provenance:
[
"verification verified"
],

blockedReasons:
[]

});

assert.equal(
observation.provenance.length > 0,
true
);

});
