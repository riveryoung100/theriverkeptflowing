import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceExecution
} from "./execution-intelligence-execution-foundation-engine";

test(
"creates executed intelligence execution from authorized action",
() => {

const execution =
createExecutionIntelligenceExecution({

version:
"1.0.0",

source:
"test",

objective:
"Build capability",

authorized:
true,

actions:
[
"execute approved operation"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
execution.executed,
true
);

assert.equal(
execution.executionState.length > 0,
true
);

}
);

test(
"blocks execution from unauthorized action",
() => {

const execution =
createExecutionIntelligenceExecution({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe capability",

authorized:
false,

actions:
[
"blocked operation"
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
execution.executed,
false
);

assert.equal(
execution.blockedReasons.length > 0,
true
);

}
);

test(
"preserves execution intelligence execution provenance",
() => {

const execution =
createExecutionIntelligenceExecution({

version:
"1.0.0",

source:
"test",

objective:
"Provenance test",

authorized:
true,

actions:
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
execution.provenance.length > 0,
true
);

}
);
