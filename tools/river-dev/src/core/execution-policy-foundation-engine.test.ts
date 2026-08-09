import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionPolicy
} from "./execution-policy-foundation-engine";

test(
"creates trusted policy from trusted governance",
() => {

const policy =
createExecutionPolicy({

version:
"1.0.0",

source:
"test",

objective:
"execute governed flow",

trusted:
true,

governanceState:
[
"governance accepted"
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
"blocks policy from untrusted governance",
() => {

const policy =
createExecutionPolicy({

version:
"1.0.0",

source:
"test",

objective:
"blocked flow",

trusted:
false,

governanceState:
[
"governance blocked"
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
"preserves execution policy provenance",
() => {

const policy =
createExecutionPolicy({

version:
"1.0.0",

source:
"test",

objective:
"provenance chain",

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

