import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceOptimization
} from "./execution-intelligence-optimization-foundation-engine";

test(
"creates trusted intelligence optimization from trusted intelligence adaptation",
() => {

const optimization =
createExecutionIntelligenceOptimization({

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
optimization.trusted,
true
);

assert.equal(
optimization.optimizationState.length > 0,
true
);

}
);


test(
"blocks intelligence optimization from untrusted intelligence adaptation",
() => {

const optimization =
createExecutionIntelligenceOptimization({

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
optimization.trusted,
false
);

assert.equal(
optimization.blockedReasons.length > 0,
true
);

}
);


test(
"preserves execution intelligence optimization provenance",
() => {

const optimization =
createExecutionIntelligenceOptimization({

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
optimization.provenance.length > 0,
true
);

}
);
