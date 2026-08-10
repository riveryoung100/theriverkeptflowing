import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceGovernanceOptimization
} from "./execution-intelligence-governance-optimization-foundation-engine";

test(
"creates trusted governance optimization from trusted governance adaptation",
() => {

const governanceOptimization =
createExecutionIntelligenceGovernanceOptimization({

version:
"1.0.0",

source:
"test",

objective:
"Build governed optimized capability",

trusted:
true,

governanceAdaptationState:
[
"governance adaptation accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
governanceOptimization.trusted,
true
);

assert.equal(
governanceOptimization.governanceOptimizationState.length > 0,
true
);

assert.equal(
governanceOptimization.blockedReasons.length,
0
);

}
);

test(
"blocks governance optimization from untrusted governance adaptation",
() => {

const governanceOptimization =
createExecutionIntelligenceGovernanceOptimization({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe governed optimization",

trusted:
false,

governanceAdaptationState:
[
"governance adaptation restricted"
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
governanceOptimization.trusted,
false
);

assert.equal(
governanceOptimization.blockedReasons.length > 0,
true
);

}
);

test(
"blocks governance optimization when governance adaptation contains blocked reasons",
() => {

const governanceOptimization =
createExecutionIntelligenceGovernanceOptimization({

version:
"1.0.0",

source:
"test",

objective:
"Blocked governed optimization",

trusted:
true,

governanceAdaptationState:
[
"governance adaptation accepted"
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
governanceOptimization.trusted,
false
);

assert.equal(
governanceOptimization.blockedReasons.length > 0,
true
);

}
);

test(
"preserves governance optimization provenance and authorization boundaries",
() => {

const governanceOptimization =
createExecutionIntelligenceGovernanceOptimization({

version:
"1.0.0",

source:
"test",

objective:
"Governance optimization provenance test",

trusted:
true,

governanceAdaptationState:
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
governanceOptimization.provenance.length > 0,
true
);

assert.equal(
governanceOptimization.provenance.includes(
"human authorization boundary maintained"
),
true
);

assert.equal(
governanceOptimization.provenance.includes(
"strict scope boundary maintained"
),
true
);

assert.equal(
governanceOptimization.governanceOptimizationState.includes(
"repository authorization boundary preserved"
),
true
);

}
);

test(
"produces deterministic governance optimization output",
() => {

const input = {

version:
"1.0.0" as const,

source:
"test",

objective:
"Governance optimization determinism test",

trusted:
true,

governanceAdaptationState:
[
"governance adaptation accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

};

const first =
createExecutionIntelligenceGovernanceOptimization(input);

const second =
createExecutionIntelligenceGovernanceOptimization(input);

assert.deepEqual(
first,
second
);

}
);
