import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceAdaptation
} from "./execution-intelligence-adaptation-foundation-engine";

test(
"creates trusted intelligence adaptation from trusted intelligence learning",
() => {

const adaptation =
createExecutionIntelligenceAdaptation({

version:
"1.0.0",

source:
"test",

objective:
"Build capability",

trusted:
true,

learningState:
[
"intelligence learning completed"
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
"blocks intelligence adaptation from untrusted intelligence learning",
() => {

const adaptation =
createExecutionIntelligenceAdaptation({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe capability",

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
"preserves execution intelligence adaptation provenance",
() => {

const adaptation =
createExecutionIntelligenceAdaptation({

version:
"1.0.0",

source:
"test",

objective:
"Provenance test",

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
