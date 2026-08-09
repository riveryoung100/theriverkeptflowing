import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionAdaptation
} from "./execution-adaptation-foundation-engine";


test(
"creates trusted adaptation from trusted learning",
() => {

const adaptation =
createExecutionAdaptation({

version:
"1.0.0",

source:
"test",

objective:
"execute repository change",

trusted:
true,

learningState:
[
"learning accepted"
],

provenance:
[
"learning verified"
],

blockedReasons:
[]

});

assert.equal(
adaptation.trusted,
true
);

assert.equal(
adaptation.adaptationState.length > 0,
true
);

});


test(
"blocks adaptation from untrusted learning",
() => {

const adaptation =
createExecutionAdaptation({

version:
"1.0.0",

source:
"test",

objective:
"execute repository change",

trusted:
false,

learningState:
[
"learning blocked"
],

provenance:
[
"learning preserved"
],

blockedReasons:
[
"learning not trusted"
]

});

assert.equal(
adaptation.trusted,
false
);

assert.equal(
adaptation.blockedReasons.length > 0,
true
);

});


test(
"preserves execution adaptation provenance",
() => {

const adaptation =
createExecutionAdaptation({

version:
"1.0.0",

source:
"test",

objective:
"validate adaptation chain",

trusted:
true,

learningState:
[
"validated"
],

provenance:
[
"learning verified"
],

blockedReasons:
[]

});

assert.equal(
adaptation.provenance.length > 0,
true
);

});
