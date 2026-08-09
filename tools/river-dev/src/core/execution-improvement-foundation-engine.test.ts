import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionImprovement
} from "./execution-improvement-foundation-engine";

test(
"creates trusted improvement from trusted adaptation",
() => {

const improvement =
createExecutionImprovement({

version:
"1.0.0",

source:
"test",

objective:
"execute repository change",

trusted:
true,

adaptationState:
[
"adaptation accepted"
],

provenance:
[
"adaptation verified"
],

blockedReasons:
[]

});

assert.equal(
improvement.trusted,
true
);

assert.equal(
improvement.improvementState.length > 0,
true
);

});

test(
"blocks improvement from untrusted adaptation",
() => {

const improvement =
createExecutionImprovement({

version:
"1.0.0",

source:
"test",

objective:
"execute repository change",

trusted:
false,

adaptationState:
[
"adaptation blocked"
],

provenance:
[
"adaptation preserved"
],

blockedReasons:
[
"adaptation not trusted"
]

});

assert.equal(
improvement.trusted,
false
);

assert.equal(
improvement.blockedReasons.length > 0,
true
);

});

test(
"preserves execution improvement provenance",
() => {

const improvement =
createExecutionImprovement({

version:
"1.0.0",

source:
"test",

objective:
"validate improvement chain",

trusted:
true,

adaptationState:
[
"validated"
],

provenance:
[
"adaptation verified"
],

blockedReasons:
[]

});

assert.equal(
improvement.provenance.length > 0,
true
);

});
