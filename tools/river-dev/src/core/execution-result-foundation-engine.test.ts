import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionResult
} from "./execution-result-foundation-engine";


test(
"creates successful result from trusted action",
() => {

const result =
createExecutionResult({

version:
"1.0.0",

source:
"test",

objective:
"execute governed flow",

trusted:
true,

actionState:
[
"action completed"
],

provenance:
[
"verified"
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

}
);


test(
"blocks result from untrusted action",
() => {

const result =
createExecutionResult({

version:
"1.0.0",

source:
"test",

objective:
"blocked flow",

trusted:
false,

actionState:
[
"action blocked"
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

}
);


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
"provenance chain",

trusted:
true,

actionState:
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
result.provenance.length > 0,
true
);

}
);

