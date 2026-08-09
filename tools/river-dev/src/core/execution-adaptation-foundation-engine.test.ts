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
"execute governed flow",

trusted:
true,

learningState:
[
"learning completed"
],

provenance:
[
"verified"
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

}
);


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
"blocked flow",

trusted:
false,

learningState:
[
"learning blocked"
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
adaptation.trusted,
false
);

assert.equal(
adaptation.blockedReasons.length > 0,
true
);

}
);


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
"provenance chain",

trusted:
true,

learningState:
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
adaptation.provenance.length > 0,
true
);

}
);
