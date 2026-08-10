import assert from "node:assert/strict";
import test from "node:test";

import {
createExecutionIntelligenceGovernanceAssurance
} from "./execution-intelligence-governance-assurance-foundation-engine";

import type {
RiverDevExecutionIntelligenceGovernanceStabilizationFoundation
} from "../types";

function createGovernanceStabilization(
overrides:
Partial<RiverDevExecutionIntelligenceGovernanceStabilizationFoundation> = {}
):
RiverDevExecutionIntelligenceGovernanceStabilizationFoundation {

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-governance-stabilization",

objective:
"preserve controlled execution intelligence governance",

trusted:
true,

governanceStabilizationState:
[
"governance maturation accepted",
"governance stabilization created",
"controlled governance stabilization preserved",
"repository authorization boundary preserved"
],

provenance:
[
"governance maturation verified",
"governance stabilization provenance preserved",
"human authorization boundary maintained",
"strict scope boundary maintained"
],

blockedReasons:
[],

...overrides

};

}

test(
"creates trusted governance assurance from trusted governance stabilization",
() => {

const stabilization =
createGovernanceStabilization();

const assurance =
createExecutionIntelligenceGovernanceAssurance(
stabilization
);

assert.equal(
assurance.trusted,
true
);

assert.deepEqual(
assurance.blockedReasons,
[]
);

assert.ok(
assurance.governanceAssuranceState.includes(
"governance assurance created"
)
);

}
);

test(
"blocks governance assurance from untrusted governance stabilization",
() => {

const stabilization =
createGovernanceStabilization({
trusted: false
});

const assurance =
createExecutionIntelligenceGovernanceAssurance(
stabilization
);

assert.equal(
assurance.trusted,
false
);

assert.deepEqual(
assurance.blockedReasons,
[
"governance stabilization not trusted"
]
);

}
);

test(
"blocks governance assurance when governance stabilization contains blocked reasons",
() => {

const stabilization =
createGovernanceStabilization({
blockedReasons: [
"governance stabilization blocked"
]
});

const assurance =
createExecutionIntelligenceGovernanceAssurance(
stabilization
);

assert.equal(
assurance.trusted,
false
);

assert.deepEqual(
assurance.blockedReasons,
[
"governance stabilization not trusted"
]
);

}
);

test(
"preserves governance assurance provenance and authorization boundaries",
() => {

const stabilization =
createGovernanceStabilization();

const assurance =
createExecutionIntelligenceGovernanceAssurance(
stabilization
);

assert.ok(
assurance.provenance.includes(
"governance assurance provenance preserved"
)
);

assert.ok(
assurance.provenance.includes(
"human authorization boundary maintained"
)
);

assert.ok(
assurance.provenance.includes(
"strict scope boundary maintained"
)
);

assert.ok(
assurance.governanceAssuranceState.includes(
"repository authorization boundary preserved"
)
);

}
);

test(
"produces deterministic governance assurance output",
() => {

const stabilization =
createGovernanceStabilization();

const first =
createExecutionIntelligenceGovernanceAssurance(
stabilization
);

const second =
createExecutionIntelligenceGovernanceAssurance(
stabilization
);

assert.deepEqual(
first,
second
);

}
);
