import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceAssurance
} from "./execution-intelligence-assurance-foundation-engine";

test(
"creates trusted intelligence assurance from trusted intelligence stabilization",
() => {

const assurance =
createExecutionIntelligenceAssurance({

version:
"1.0.0",

source:
"test",

objective:
"Build capability",

trusted:
true,

stabilizationState:
[
"intelligence stabilization accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
assurance.trusted,
true
);

assert.equal(
assurance.assuranceState.length > 0,
true
);

}
);

test(
"blocks intelligence assurance from untrusted intelligence stabilization",
() => {

const assurance =
createExecutionIntelligenceAssurance({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe capability",

trusted:
false,

stabilizationState:
[
"intelligence stabilization blocked"
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
assurance.trusted,
false
);

assert.equal(
assurance.blockedReasons.length > 0,
true
);

}
);

test(
"preserves execution intelligence assurance provenance",
() => {

const assurance =
createExecutionIntelligenceAssurance({

version:
"1.0.0",

source:
"test",

objective:
"Provenance test",

trusted:
true,

stabilizationState:
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
assurance.provenance.length > 0,
true
);

}
);
