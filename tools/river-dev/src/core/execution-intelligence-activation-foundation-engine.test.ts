import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceActivation
} from "./execution-intelligence-activation-foundation-engine";

test(
"creates trusted intelligence activation from trusted intelligence readiness",
() => {

const activation =
createExecutionIntelligenceActivation({

version:
"1.0.0",

source:
"test",

objective:
"Build capability",

trusted:
true,

readinessState:
[
"intelligence readiness accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
activation.trusted,
true
);

assert.equal(
activation.activationState.length > 0,
true
);

}
);


test(
"blocks intelligence activation from untrusted intelligence readiness",
() => {

const activation =
createExecutionIntelligenceActivation({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe capability",

trusted:
false,

readinessState:
[
"intelligence readiness blocked"
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
activation.trusted,
false
);

assert.equal(
activation.blockedReasons.length > 0,
true
);

}
);


test(
"preserves execution intelligence activation provenance",
() => {

const activation =
createExecutionIntelligenceActivation({

version:
"1.0.0",

source:
"test",

objective:
"Provenance test",

trusted:
true,

readinessState:
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
activation.provenance.length > 0,
true
);

}
);
