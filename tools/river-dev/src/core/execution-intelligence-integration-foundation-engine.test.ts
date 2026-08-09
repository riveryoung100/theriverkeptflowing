import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceIntegration
} from "./execution-intelligence-integration-foundation-engine";

test(
"creates trusted intelligence integration from trusted intelligence consolidation",
() => {

const integration =
createExecutionIntelligenceIntegration({

version:
"1.0.0",

source:
"test",

objective:
"Build capability",

trusted:
true,

consolidationState:
[
"intelligence consolidation accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
integration.trusted,
true
);

assert.equal(
integration.integrationState.length > 0,
true
);

}
);

test(
"blocks intelligence integration from untrusted intelligence consolidation",
() => {

const integration =
createExecutionIntelligenceIntegration({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe capability",

trusted:
false,

consolidationState:
[
"intelligence consolidation blocked"
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
integration.trusted,
false
);

assert.equal(
integration.blockedReasons.length > 0,
true
);

}
);

test(
"preserves execution intelligence integration provenance",
() => {

const integration =
createExecutionIntelligenceIntegration({

version:
"1.0.0",

source:
"test",

objective:
"Provenance test",

trusted:
true,

consolidationState:
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
integration.provenance.length > 0,
true
);

}
);
