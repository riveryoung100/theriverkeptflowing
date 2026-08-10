import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceGovernanceStabilization
} from "./execution-intelligence-governance-stabilization-foundation-engine";

test(
"creates trusted governance stabilization from trusted governance maturation",
() => {

const governanceStabilization =
createExecutionIntelligenceGovernanceStabilization({

version:
"1.0.0",

source:
"test",

objective:
"Build governed stabilization capability",

trusted:
true,

governanceMaturationState:
[
"governance maturation accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
governanceStabilization.trusted,
true
);

assert.equal(
governanceStabilization.governanceStabilizationState.length > 0,
true
);

assert.equal(
governanceStabilization.blockedReasons.length,
0
);

}
);

test(
"blocks governance stabilization from untrusted governance maturation",
() => {

const governanceStabilization =
createExecutionIntelligenceGovernanceStabilization({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe governed stabilization",

trusted:
false,

governanceMaturationState:
[
"governance maturation restricted"
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
governanceStabilization.trusted,
false
);

assert.equal(
governanceStabilization.blockedReasons.length > 0,
true
);

}
);

test(
"blocks governance stabilization when governance maturation contains blocked reasons",
() => {

const governanceStabilization =
createExecutionIntelligenceGovernanceStabilization({

version:
"1.0.0",

source:
"test",

objective:
"Blocked governed stabilization",

trusted:
true,

governanceMaturationState:
[
"governance maturation accepted"
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
governanceStabilization.trusted,
false
);

assert.equal(
governanceStabilization.blockedReasons.length > 0,
true
);

}
);

test(
"preserves governance stabilization provenance and authorization boundaries",
() => {

const governanceStabilization =
createExecutionIntelligenceGovernanceStabilization({

version:
"1.0.0",

source:
"test",

objective:
"Governance stabilization provenance test",

trusted:
true,

governanceMaturationState:
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
governanceStabilization.provenance.length > 0,
true
);

assert.equal(
governanceStabilization.provenance.includes(
"human authorization boundary maintained"
),
true
);

assert.equal(
governanceStabilization.provenance.includes(
"strict scope boundary maintained"
),
true
);

assert.equal(
governanceStabilization.governanceStabilizationState.includes(
"repository authorization boundary preserved"
),
true
);

}
);

test(
"produces deterministic governance stabilization output",
() => {

const input = {

version:
"1.0.0" as const,

source:
"test",

objective:
"Governance stabilization determinism test",

trusted:
true,

governanceMaturationState:
[
"governance maturation accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

};

const first =
createExecutionIntelligenceGovernanceStabilization(input);

const second =
createExecutionIntelligenceGovernanceStabilization(input);

assert.deepEqual(
first,
second
);

}
);
