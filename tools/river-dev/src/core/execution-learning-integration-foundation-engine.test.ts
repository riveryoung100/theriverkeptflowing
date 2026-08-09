import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionLearningIntegration
} from "./execution-learning-integration-foundation-engine";

test(
"creates trusted learning integration from trusted reflection",
() => {

const integration =
createExecutionLearningIntegration({

version:
"1.0.0",

source:
"test",

objective:
"Build capability",

trusted:
true,

reflectionState:
[
"reflection accepted"
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
integration.learningState.length > 0,
true
);

}
);


test(
"blocks learning integration from untrusted reflection",
() => {

const integration =
createExecutionLearningIntegration({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe capability",

trusted:
false,

reflectionState:
[
"reflection blocked"
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
"preserves execution learning integration provenance",
() => {

const integration =
createExecutionLearningIntegration({

version:
"1.0.0",

source:
"test",

objective:
"Provenance test",

trusted:
true,

reflectionState:
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
