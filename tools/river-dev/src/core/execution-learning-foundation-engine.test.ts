import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionLearning
} from "./execution-learning-foundation-engine";

test(
"creates trusted learning from trusted execution feedback",
() => {

const learning =
createExecutionLearning({

version:
"1.0.0",

source:
"test",

objective:
"execute repository change",

trusted:
true,

feedbackState:
[
"feedback accepted"
],

provenance:
[
"feedback verified"
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

});


test(
"blocks learning from untrusted execution feedback",
() => {

const learning =
createExecutionLearning({

version:
"1.0.0",

source:
"test",

objective:
"execute repository change",

trusted:
false,

feedbackState:
[
"feedback blocked"
],

provenance:
[
"feedback preserved"
],

blockedReasons:
[
"feedback not trusted"
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

});


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
"validate learning chain",

trusted:
true,

feedbackState:
[
"validated"
],

provenance:
[
"feedback verified"
],

blockedReasons:
[]

});

assert.equal(
learning.provenance.length > 0,
true
);

});
