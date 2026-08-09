import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionRuntime
} from "./execution-runtime-foundation-engine";


test(
"creates runtime from controlled execution state",
() => {

const runtime =
createExecutionRuntime({

version:
"1.0.0",

source:
"test",

objective:
"execute repository change",

controlled:
true,

authorized:
true,

executionRequest:
[
"approved execution request"
],

provenance:
[
"execution control verified"
],

blockedReasons:
[]

});


assert.equal(
runtime.running,
true
);

assert.equal(
runtime.authorized,
true
);

assert.equal(
runtime.runtimeState.length > 0,
true
);

});


test(
"blocks runtime from uncontrolled execution state",
() => {

const runtime =
createExecutionRuntime({

version:
"1.0.0",

source:
"test",

objective:
"execute repository change",

controlled:
false,

authorized:
false,

executionRequest:
[
"review required"
],

provenance:
[
"execution control preserved"
],

blockedReasons:
[
"authorization missing"
]

});


assert.equal(
runtime.running,
false
);

assert.equal(
runtime.blockedReasons.length > 0,
true
);

});


test(
"preserves runtime provenance",
() => {

const runtime =
createExecutionRuntime({

version:
"1.0.0",

source:
"test",

objective:
"validate runtime chain",

controlled:
true,

authorized:
true,

executionRequest:
[
"validate execution"
],

provenance:
[
"execution verified"
],

blockedReasons:
[]

});


assert.equal(
runtime.provenance.length > 0,
true
);

});
