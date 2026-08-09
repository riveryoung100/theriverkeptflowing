import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceExecutionControl
} from "./execution-intelligence-execution-control-foundation-engine";


test(
"creates controlled execution from authorized orchestration",
() => {

const control =
createExecutionIntelligenceExecutionControl({

version:
"1.0.0",

source:
"test",

objective:
"execute repository change",

orchestrated:
true,

authorized:
true,

pipeline:
[
"understanding",
"interpretation",
"reasoning",
"decision",
"action",
"orchestration"
],

provenance:
[
"orchestration verified"
],

blockedReasons:
[]

});


assert.equal(
control.controlled,
true
);


assert.equal(
control.authorized,
true
);


assert.equal(
control.executionRequest.length > 0,
true
);


});


test(
"blocks execution control from unauthorized orchestration",
() => {

const control =
createExecutionIntelligenceExecutionControl({

version:
"1.0.0",

source:
"test",

objective:
"execute repository change",

orchestrated:
false,

authorized:
false,

pipeline:
[
"review required"
],

provenance:
[
"orchestration preserved"
],

blockedReasons:
[
"authorization missing"
]

});


assert.equal(
control.controlled,
false
);


assert.equal(
control.blockedReasons.length > 0,
true
);


});


test(
"preserves execution control provenance",
() => {

const control =
createExecutionIntelligenceExecutionControl({

version:
"1.0.0",

source:
"test",

objective:
"validate execution chain",

orchestrated:
true,

authorized:
true,

pipeline:
[
"controlled execution"
],

provenance:
[
"orchestration verified"
],

blockedReasons:
[]

});


assert.equal(
control.provenance.length > 0,
true
);


});
