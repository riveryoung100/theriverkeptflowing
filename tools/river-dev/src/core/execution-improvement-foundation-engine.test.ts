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
"execute governed flow",

trusted:
true,

adaptationState:
[
"adaptation completed"
],

provenance:
[
"verified"
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

}
);


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
"blocked flow",

trusted:
false,

adaptationState:
[
"adaptation blocked"
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
improvement.trusted,
false
);

assert.equal(
improvement.blockedReasons.length > 0,
true
);

}
);


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
"provenance chain",

trusted:
true,

adaptationState:
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
improvement.provenance.length > 0,
true
);

}
);
