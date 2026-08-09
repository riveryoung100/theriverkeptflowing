import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceReadiness
} from "./execution-intelligence-readiness-foundation-engine";

test(
"creates trusted intelligence readiness from trusted intelligence maturation",
() => {

const readiness =
createExecutionIntelligenceReadiness({

version:
"1.0.0",

source:
"test",

objective:
"Build capability",

trusted:
true,

maturationState:
[
"intelligence maturation accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
readiness.trusted,
true
);

assert.equal(
readiness.readinessState.length > 0,
true
);

}
);


test(
"blocks intelligence readiness from untrusted intelligence maturation",
() => {

const readiness =
createExecutionIntelligenceReadiness({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe capability",

trusted:
false,

maturationState:
[
"intelligence maturation blocked"
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
readiness.trusted,
false
);

assert.equal(
readiness.blockedReasons.length > 0,
true
);

}
);


test(
"preserves execution intelligence readiness provenance",
() => {

const readiness =
createExecutionIntelligenceReadiness({

version:
"1.0.0",

source:
"test",

objective:
"Provenance test",

trusted:
true,

maturationState:
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
readiness.provenance.length > 0,
true
);

}
);
