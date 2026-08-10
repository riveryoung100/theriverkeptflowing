import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceGovernance
} from "./execution-intelligence-governance-foundation-engine";

test(
"creates trusted intelligence governance from trusted intelligence validation",
() => {

const governance =
createExecutionIntelligenceGovernance({

version:
"1.0.0",

source:
"test",

objective:
"Build capability",

trusted:
true,

validationState:
[
"intelligence validation accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
governance.trusted,
true
);

assert.equal(
governance.governanceState.length > 0,
true
);

}
);

test(
"blocks intelligence governance from untrusted intelligence validation",
() => {

const governance =
createExecutionIntelligenceGovernance({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe capability",

trusted:
false,

validationState:
[
"intelligence validation blocked"
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
governance.trusted,
false
);

assert.equal(
governance.blockedReasons.length > 0,
true
);

}
);

test(
"preserves execution intelligence governance provenance",
() => {

const governance =
createExecutionIntelligenceGovernance({

version:
"1.0.0",

source:
"test",

objective:
"Provenance test",

trusted:
true,

validationState:
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
governance.provenance.length > 0,
true
);

}
);
