import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionLearning
} from "./execution-learning-foundation-engine";


test(
"creates trusted learning from trusted execution result",
() => {

const learning =
createExecutionLearning({

version:
"1.0.0",

source:
"test",

objective:
"execute governed flow",

completed:
true,

successful:
true,

resultState:
[
"execution completed"
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
"blocks learning from unsuccessful execution result",
() => {

const learning =
createExecutionLearning({

version:
"1.0.0",

source:
"test",

objective:
"blocked flow",

completed:
false,

successful:
false,

resultState:
[
"execution failed"
],

provenance:
[
"preserved"
],

blockedReasons:
[
"failed"
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
"preserves execution learning provenance",
() => {

const learning =
createExecutionLearning({

version:
"1.0.0",

source:
"test",

objective:
"provenance chain",

completed:
true,

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
