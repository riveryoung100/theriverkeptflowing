import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceGovernanceAdaptation
} from "./execution-intelligence-governance-adaptation-foundation-engine";

test(
"creates trusted governance adaptation from trusted governance evolution",
() => {

const governanceAdaptation =
createExecutionIntelligenceGovernanceAdaptation({

version:
"1.0.0",

source:
"test",

objective:
"Build governed capability",

trusted:
true,

governanceState:
[
"governance evolution completed"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
governanceAdaptation.trusted,
true
);

assert.equal(
governanceAdaptation.governanceAdaptationState.length > 0,
true
);

assert.equal(
governanceAdaptation.blockedReasons.length,
0
);

}
);

test(
"blocks governance adaptation from untrusted governance evolution",
() => {

const governanceAdaptation =
createExecutionIntelligenceGovernanceAdaptation({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe governed capability",

trusted:
false,

governanceState:
[
"governance evolution restricted"
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
governanceAdaptation.trusted,
false
);

assert.equal(
governanceAdaptation.blockedReasons.length > 0,
true
);

}
);

test(
"blocks governance adaptation when governance evolution contains blocked reasons",
() => {

const governanceAdaptation =
createExecutionIntelligenceGovernanceAdaptation({

version:
"1.0.0",

source:
"test",

objective:
"Blocked governed capability",

trusted:
true,

governanceState:
[
"governance evolution completed"
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
governanceAdaptation.trusted,
false
);

assert.equal(
governanceAdaptation.blockedReasons.length > 0,
true
);

}
);

test(
"preserves governance adaptation provenance and authorization boundaries",
() => {

const governanceAdaptation =
createExecutionIntelligenceGovernanceAdaptation({

version:
"1.0.0",

source:
"test",

objective:
"Provenance test",

trusted:
true,

governanceState:
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
governanceAdaptation.provenance.length > 0,
true
);

assert.equal(
governanceAdaptation.provenance.includes(
"human authorization boundary maintained"
),
true
);

assert.equal(
governanceAdaptation.provenance.includes(
"strict scope boundary maintained"
),
true
);

assert.equal(
governanceAdaptation.governanceAdaptationState.includes(
"repository authorization boundary preserved"
),
true
);

}
);

test(
"produces deterministic governance adaptation output",
() => {

const input = {

version:
"1.0.0" as const,

source:
"test",

objective:
"Determinism test",

trusted:
true,

governanceState:
[
"governance evolution completed"
],

provenance:
[
"verified"
],

blockedReasons:
[]

};

const first =
createExecutionIntelligenceGovernanceAdaptation(input);

const second =
createExecutionIntelligenceGovernanceAdaptation(input);

assert.deepEqual(
first,
second
);

}
);
