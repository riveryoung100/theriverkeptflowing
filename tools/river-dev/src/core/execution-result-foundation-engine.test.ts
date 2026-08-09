import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionResult
} from "./execution-result-foundation-engine";


test(
"creates successful result from completed runtime",
() => {

const result =
createExecutionResult({

version:
"1.0.0",

source:
"test",

objective:
"execute repository change",

running:
true,

authorized:
true,

runtimeState:
[
"runtime completed"
],

provenance:
[
"runtime verified"
],

blockedReasons:
[]

});


assert.equal(
result.completed,
true
);

assert.equal(
result.successful,
true
);

assert.equal(
result.resultState.length > 0,
true
);

});


test(
"blocks result from incomplete runtime",
() => {

const result =
createExecutionResult({

version:
"1.0.0",

source:
"test",

objective:
"execute repository change",

running:
false,

authorized:
false,

runtimeState:
[
"runtime blocked"
],

provenance:
[
"runtime preserved"
],

blockedReasons:
[
"authorization missing"
]

});


assert.equal(
result.completed,
false
);

assert.equal(
result.successful,
false
);

assert.equal(
result.blockedReasons.length > 0,
true
);

});


test(
"preserves execution result provenance",
() => {

const result =
createExecutionResult({

version:
"1.0.0",

source:
"test",

objective:
"validate result chain",

running:
true,

authorized:
true,

runtimeState:
[
"validated"
],

provenance:
[
"runtime verified"
],

blockedReasons:
[]

});


assert.equal(
result.provenance.length > 0,
true
);

});
