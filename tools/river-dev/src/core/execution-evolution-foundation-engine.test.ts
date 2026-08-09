import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionEvolution
} from "./execution-evolution-foundation-engine";

test(
"creates trusted evolution from trusted improvement",
() => {

const evolution =
createExecutionEvolution({

version:
"1.0.0",

source:
"test",

objective:
"execute repository change",

trusted:
true,

improvementState:
[
"improvement accepted"
],

provenance:
[
"improvement verified"
],

blockedReasons:
[]

});

assert.equal(
evolution.trusted,
true
);

assert.equal(
evolution.evolutionState.length > 0,
true
);

});


test(
"blocks evolution from untrusted improvement",
() => {

const evolution =
createExecutionEvolution({

version:
"1.0.0",

source:
"test",

objective:
"execute repository change",

trusted:
false,

improvementState:
[
"improvement blocked"
],

provenance:
[
"improvement preserved"
],

blockedReasons:
[
"improvement not trusted"
]

});

assert.equal(
evolution.trusted,
false
);

assert.equal(
evolution.blockedReasons.length > 0,
true
);

});


test(
"preserves execution evolution provenance",
() => {

const evolution =
createExecutionEvolution({

version:
"1.0.0",

source:
"test",

objective:
"validate evolution chain",

trusted:
true,

improvementState:
[
"validated"
],

provenance:
[
"improvement verified"
],

blockedReasons:
[]

});

assert.equal(
evolution.provenance.length > 0,
true
);

});
