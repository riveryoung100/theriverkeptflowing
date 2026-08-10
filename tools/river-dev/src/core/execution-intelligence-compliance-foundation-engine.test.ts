import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceCompliance
} from "./execution-intelligence-compliance-foundation-engine";

test(
"creates trusted intelligence compliance from trusted intelligence policy",
() => {

const compliance =
createExecutionIntelligenceCompliance({

version:
"1.0.0",

source:
"test",

objective:
"Build capability",

trusted:
true,

policyState:
[
"intelligence policy accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
compliance.trusted,
true
);

assert.equal(
compliance.complianceState.length > 0,
true
);

}
);

test(
"blocks intelligence compliance from untrusted intelligence policy",
() => {

const compliance =
createExecutionIntelligenceCompliance({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe capability",

trusted:
false,

policyState:
[
"intelligence policy blocked"
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
compliance.trusted,
false
);

assert.equal(
compliance.blockedReasons.length > 0,
true
);

}
);

test(
"preserves execution intelligence compliance provenance",
() => {

const compliance =
createExecutionIntelligenceCompliance({

version:
"1.0.0",

source:
"test",

objective:
"Provenance test",

trusted:
true,

policyState:
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
compliance.provenance.length > 0,
true
);

}
);
