import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceStabilization
} from "./execution-intelligence-stabilization-foundation-engine";

test(
"creates trusted intelligence stabilization from trusted intelligence integration",
() => {

const stabilization =
createExecutionIntelligenceStabilization({

version:
"1.0.0",

source:
"test",

objective:
"Build capability",

trusted:
true,

integrationState:
[
"intelligence integration accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
stabilization.trusted,
true
);

assert.equal(
stabilization.stabilizationState.length > 0,
true
);

}
);

test(
"blocks intelligence stabilization from untrusted intelligence integration",
() => {

const stabilization =
createExecutionIntelligenceStabilization({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe capability",

trusted:
false,

integrationState:
[
"intelligence integration blocked"
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
stabilization.trusted,
false
);

assert.equal(
stabilization.blockedReasons.length > 0,
true
);

}
);

test(
"preserves execution intelligence stabilization provenance",
() => {

const stabilization =
createExecutionIntelligenceStabilization({

version:
"1.0.0",

source:
"test",

objective:
"Provenance test",

trusted:
true,

integrationState:
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
stabilization.provenance.length > 0,
true
);

}
);
