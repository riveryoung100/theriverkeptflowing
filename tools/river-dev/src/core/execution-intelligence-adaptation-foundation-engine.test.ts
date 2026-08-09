import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceAdaptation
} from "./execution-intelligence-adaptation-foundation-engine";

test(
"creates trusted intelligence adaptation from trusted intelligence orchestration",
() => {

const adaptation =
createExecutionIntelligenceAdaptation({

version:
"1.0.0",

source:
"test",

objective:
"Build capability",

orchestrated:
true,

authorized:
true,

pipeline:
[
"intelligence orchestration accepted"
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
"blocks intelligence adaptation from untrusted intelligence orchestration",
() => {

const adaptation =
createExecutionIntelligenceAdaptation({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe capability",

orchestrated:
false,

authorized:
false,

pipeline:
[
"intelligence orchestration blocked"
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

orchestrated:
true,

authorized:
true,

pipeline:
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
