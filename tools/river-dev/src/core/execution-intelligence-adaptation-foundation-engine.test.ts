import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceAdaptation
} from "./execution-intelligence-adaptation-foundation-engine";

test(
"creates trusted intelligence adaptation from trusted intelligence evolution",
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

evolutionState:
[
"intelligence evolution accepted"
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
"blocks intelligence adaptation from untrusted intelligence evolution",
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

evolutionState:
[
"intelligence evolution blocked"
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

evolutionState:
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
