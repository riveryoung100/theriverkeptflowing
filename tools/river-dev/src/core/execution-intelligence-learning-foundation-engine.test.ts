import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceLearning
} from "./execution-intelligence-learning-foundation-engine";

test(
"creates trusted intelligence learning from successful intelligence result",
() => {

const learning =
createExecutionIntelligenceLearning({

version:
"1.0.0",

source:
"test",

objective:
"Build capability",

successful:
true,

resultState:
[
"intelligence result completed"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
learning.trusted,
true
);

assert.equal(
learning.learningState.length > 0,
true
);

}
);

test(
"blocks intelligence learning from unsuccessful intelligence result",
() => {

const learning =
createExecutionIntelligenceLearning({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe capability",

successful:
false,

resultState:
[
"result blocked"
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
learning.trusted,
false
);

assert.equal(
learning.blockedReasons.length > 0,
true
);

}
);

test(
"preserves execution intelligence learning provenance",
() => {

const learning =
createExecutionIntelligenceLearning({

version:
"1.0.0",

source:
"test",

objective:
"Provenance test",

successful:
true,

resultState:
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
learning.provenance.length > 0,
true
);

}
);
