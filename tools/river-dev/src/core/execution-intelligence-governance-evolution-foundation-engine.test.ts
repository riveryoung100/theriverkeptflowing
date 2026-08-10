import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceGovernanceEvolution
} from "./execution-intelligence-governance-evolution-foundation-engine";

test(
"creates trusted governance evolution from trusted intelligence evolution",
() => {

const governanceEvolution =
createExecutionIntelligenceGovernanceEvolution({

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
"intelligence evolution completed"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
governanceEvolution.trusted,
true
);

assert.equal(
governanceEvolution.governanceState.length > 0,
true
);

}
);

test(
"blocks governance evolution from untrusted intelligence evolution",
() => {

const governanceEvolution =
createExecutionIntelligenceGovernanceEvolution({

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
"evolution blocked"
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
governanceEvolution.trusted,
false
);

assert.equal(
governanceEvolution.blockedReasons.length > 0,
true
);

}
);

test(
"preserves execution intelligence governance evolution provenance",
() => {

const governanceEvolution =
createExecutionIntelligenceGovernanceEvolution({

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
governanceEvolution.provenance.length > 0,
true
);

}
);
