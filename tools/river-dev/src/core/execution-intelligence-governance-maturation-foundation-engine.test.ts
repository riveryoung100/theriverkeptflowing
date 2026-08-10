import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceGovernanceMaturation
} from "./execution-intelligence-governance-maturation-foundation-engine";

test(
"creates trusted governance maturation from trusted governance refinement",
() => {

const governanceMaturation =
createExecutionIntelligenceGovernanceMaturation({

version:
"1.0.0",

source:
"test",

objective:
"Build governed maturation capability",

trusted:
true,

governanceRefinementState:
[
"governance refinement accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
governanceMaturation.trusted,
true
);

assert.equal(
governanceMaturation.governanceMaturationState.length > 0,
true
);

assert.equal(
governanceMaturation.blockedReasons.length,
0
);

}
);

test(
"blocks governance maturation from untrusted governance refinement",
() => {

const governanceMaturation =
createExecutionIntelligenceGovernanceMaturation({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe governed maturation",

trusted:
false,

governanceRefinementState:
[
"governance refinement restricted"
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
governanceMaturation.trusted,
false
);

assert.equal(
governanceMaturation.blockedReasons.length > 0,
true
);

}
);

test(
"blocks governance maturation when governance refinement contains blocked reasons",
() => {

const governanceMaturation =
createExecutionIntelligenceGovernanceMaturation({

version:
"1.0.0",

source:
"test",

objective:
"Blocked governed maturation",

trusted:
true,

governanceRefinementState:
[
"governance refinement accepted"
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
governanceMaturation.trusted,
false
);

assert.equal(
governanceMaturation.blockedReasons.length > 0,
true
);

}
);

test(
"preserves governance maturation provenance and authorization boundaries",
() => {

const governanceMaturation =
createExecutionIntelligenceGovernanceMaturation({

version:
"1.0.0",

source:
"test",

objective:
"Governance maturation provenance test",

trusted:
true,

governanceRefinementState:
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
governanceMaturation.provenance.length > 0,
true
);

assert.equal(
governanceMaturation.provenance.includes(
"human authorization boundary maintained"
),
true
);

assert.equal(
governanceMaturation.provenance.includes(
"strict scope boundary maintained"
),
true
);

assert.equal(
governanceMaturation.governanceMaturationState.includes(
"repository authorization boundary preserved"
),
true
);

}
);

test(
"produces deterministic governance maturation output",
() => {

const input = {

version:
"1.0.0" as const,

source:
"test",

objective:
"Governance maturation determinism test",

trusted:
true,

governanceRefinementState:
[
"governance refinement accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

};

const first =
createExecutionIntelligenceGovernanceMaturation(input);

const second =
createExecutionIntelligenceGovernanceMaturation(input);

assert.deepEqual(
first,
second
);

}
);
