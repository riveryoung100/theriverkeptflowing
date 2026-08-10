import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceResult
} from "./execution-intelligence-result-foundation-engine";

test(
"creates successful intelligence result from completed execution",
() => {

const result =
createExecutionIntelligenceResult({

version:
"1.0.0",

source:
"test",

objective:
"Build capability",

executed:
true,

executionState:
[
"intelligence execution completed"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
result.successful,
true
);

assert.equal(
result.resultState.length > 0,
true
);

}
);

test(
"blocks intelligence result from unsuccessful execution",
() => {

const result =
createExecutionIntelligenceResult({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe capability",

executed:
false,

executionState:
[
"execution blocked"
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
"preserves execution intelligence result provenance",
() => {

const result =
createExecutionIntelligenceResult({

version:
"1.0.0",

source:
"test",

objective:
"Provenance test",

executed:
true,

executionState:
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
