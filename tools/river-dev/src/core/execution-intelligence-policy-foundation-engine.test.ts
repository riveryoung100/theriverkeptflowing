import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligencePolicy
} from "./execution-intelligence-policy-foundation-engine";

test(
"creates trusted intelligence policy from trusted intelligence governance",
() => {

const policy =
createExecutionIntelligencePolicy({

version:
"1.0.0",

source:
"test",

objective:
"Build capability",

trusted:
true,

governanceState:
[
"intelligence governance accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
policy.trusted,
true
);

assert.equal(
policy.policyState.length > 0,
true
);

}
);


test(
"blocks intelligence policy from untrusted intelligence governance",
() => {

const policy =
createExecutionIntelligencePolicy({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe capability",

trusted:
false,

governanceState:
[
"intelligence governance blocked"
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
policy.trusted,
false
);

assert.equal(
policy.blockedReasons.length > 0,
true
);

}
);


test(
"preserves execution intelligence policy provenance",
() => {

const policy =
createExecutionIntelligencePolicy({

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
policy.provenance.length > 0,
true
);

}
);
