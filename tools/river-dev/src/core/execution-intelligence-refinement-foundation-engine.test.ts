import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceRefinement
} from "./execution-intelligence-refinement-foundation-engine";

test(
"creates trusted intelligence refinement from trusted intelligence optimization",
() => {

const refinement =
createExecutionIntelligenceRefinement({

version:
"1.0.0",

source:
"test",

objective:
"Build capability",

trusted:
true,

optimizationState:
[
"intelligence optimization accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
refinement.trusted,
true
);

assert.equal(
refinement.refinementState.length > 0,
true
);

}
);

test(
"blocks intelligence refinement from untrusted intelligence optimization",
() => {

const refinement =
createExecutionIntelligenceRefinement({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe capability",

trusted:
false,

optimizationState:
[
"intelligence optimization blocked"
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
refinement.trusted,
false
);

assert.equal(
refinement.blockedReasons.length > 0,
true
);

}
);

test(
"preserves execution intelligence refinement provenance",
() => {

const refinement =
createExecutionIntelligenceRefinement({

version:
"1.0.0",

source:
"test",

objective:
"Provenance test",

trusted:
true,

optimizationState:
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
refinement.provenance.length > 0,
true
);

}
);
