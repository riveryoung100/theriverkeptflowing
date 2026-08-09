import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionFeedback
} from "./execution-feedback-foundation-engine";


test(
"creates trusted feedback from successful execution result",
() => {

const feedback =
createExecutionFeedback({

version:
"1.0.0",

source:
"test",

objective:
"execute repository change",

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
"result verified"
],

blockedReasons:
[]

});


assert.equal(
feedback.trusted,
true
);

assert.equal(
feedback.feedbackState.length > 0,
true
);

});


test(
"blocks feedback from failed execution result",
() => {

const feedback =
createExecutionFeedback({

version:
"1.0.0",

source:
"test",

objective:
"execute repository change",

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
"result preserved"
],

blockedReasons:
[
"execution failed"
]

});


assert.equal(
feedback.trusted,
false
);

assert.equal(
feedback.blockedReasons.length > 0,
true
);

});


test(
"preserves feedback provenance",
() => {

const feedback =
createExecutionFeedback({

version:
"1.0.0",

source:
"test",

objective:
"validate feedback chain",

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
"result verified"
],

blockedReasons:
[]

});


assert.equal(
feedback.provenance.length > 0,
true
);

});
