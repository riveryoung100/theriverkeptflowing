import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceEvolution
} from "./execution-intelligence-evolution-foundation-engine";


test(
"creates trusted intelligence evolution from trusted intelligence adaptation",
() => {

const evolution =
createExecutionIntelligenceEvolution({

version:
"1.0.0",

source:
"test",

objective:
"Build capability",

trusted:
true,

adaptationState:
[
"intelligence adaptation accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});


assert.equal(
evolution.trusted,
true
);

assert.equal(
evolution.evolutionState.length > 0,
true
);

}
);


test(
"blocks intelligence evolution from untrusted intelligence adaptation",
() => {

const evolution =
createExecutionIntelligenceEvolution({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe capability",

trusted:
false,

adaptationState:
[
"intelligence adaptation blocked"
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
evolution.trusted,
false
);

assert.equal(
evolution.blockedReasons.length > 0,
true
);

}
);


test(
"preserves execution intelligence evolution provenance",
() => {

const evolution =
createExecutionIntelligenceEvolution({

version:
"1.0.0",

source:
"test",

objective:
"Provenance test",

trusted:
true,

adaptationState:
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
evolution.provenance.length > 0,
true
);

}
);
