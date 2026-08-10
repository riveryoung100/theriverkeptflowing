import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceGovernanceRefinement
} from "./execution-intelligence-governance-refinement-foundation-engine";

test(
"creates trusted governance refinement from trusted governance optimization",
() => {

const governanceRefinement =
createExecutionIntelligenceGovernanceRefinement({

version:
"1.0.0",

source:
"test",

objective:
"Build governed refined capability",

trusted:
true,

governanceOptimizationState:
[
"governance optimization accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
governanceRefinement.trusted,
true
);

assert.equal(
governanceRefinement.governanceRefinementState.length > 0,
true
);

assert.equal(
governanceRefinement.blockedReasons.length,
0
);

}
);

test(
"blocks governance refinement from untrusted governance optimization",
() => {

const governanceRefinement =
createExecutionIntelligenceGovernanceRefinement({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe governed refinement",

trusted:
false,

governanceOptimizationState:
[
"governance optimization restricted"
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
governanceRefinement.trusted,
false
);

assert.equal(
governanceRefinement.blockedReasons.length > 0,
true
);

}
);

test(
"blocks governance refinement when governance optimization contains blocked reasons",
() => {

const governanceRefinement =
createExecutionIntelligenceGovernanceRefinement({

version:
"1.0.0",

source:
"test",

objective:
"Blocked governed refinement",

trusted:
true,

governanceOptimizationState:
[
"governance optimization accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[
"human authorization required"
]

});

assert.equal(
governanceRefinement.trusted,
false
);

assert.equal(
governanceRefinement.blockedReasons.length > 0,
true
);

}
);

test(
"preserves governance refinement provenance and authorization boundaries",
() => {

const governanceRefinement =
createExecutionIntelligenceGovernanceRefinement({

version:
"1.0.0",

source:
"test",

objective:
"Governance refinement provenance test",

trusted:
true,

governanceOptimizationState:
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
governanceRefinement.provenance.length > 0,
true
);

assert.equal(
governanceRefinement.provenance.includes(
"human authorization boundary maintained"
),
true
);

assert.equal(
governanceRefinement.provenance.includes(
"strict scope boundary maintained"
),
true
);

assert.equal(
governanceRefinement.governanceRefinementState.includes(
"repository authorization boundary preserved"
),
true
);

}
);

test(
"produces deterministic governance refinement output",
() => {

const input = {

version:
"1.0.0" as const,

source:
"test",

objective:
"Governance refinement determinism test",

trusted:
true,

governanceOptimizationState:
[
"governance optimization accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

};

const first =
createExecutionIntelligenceGovernanceRefinement(input);

const second =
createExecutionIntelligenceGovernanceRefinement(input);

assert.deepEqual(
first,
second
);

}
);
