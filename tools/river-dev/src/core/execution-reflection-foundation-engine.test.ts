import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionReflection
} from "./execution-reflection-foundation-engine";

test(
"creates trusted reflection from trusted continuation",
() => {

const reflection =
createExecutionReflection({

version:
"1.0.0",

source:
"test",

objective:
"Build capability",

authorized:
true,

continuationState:
"continuation accepted",

continuationActions:
[
"continue governed flow"
],

reportingSource:
"test",

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
reflection.trusted,
true
);

assert.equal(
reflection.reflectionState.length > 0,
true
);

}
);


test(
"blocks reflection from unauthorized continuation",
() => {

const reflection =
createExecutionReflection({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe capability",

authorized:
false,

continuationState:
"continuation blocked",

continuationActions:
[
"halt"
],

reportingSource:
"test",

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
reflection.trusted,
false
);

assert.equal(
reflection.blockedReasons.length > 0,
true
);

}
);


test(
"preserves execution reflection provenance",
() => {

const reflection =
createExecutionReflection({

version:
"1.0.0",

source:
"test",

objective:
"Provenance test",

authorized:
true,

continuationState:
"validated",

continuationActions:
[
"continue"
],

reportingSource:
"test",

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
reflection.provenance.length > 0,
true
);

}
);
