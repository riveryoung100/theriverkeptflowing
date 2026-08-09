import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceMaturation
} from "./execution-intelligence-maturation-foundation-engine";


test(
"creates trusted intelligence maturation from trusted intelligence refinement",
() => {

const maturation =
createExecutionIntelligenceMaturation({

version:
"1.0.0",

source:
"test",

objective:
"Build capability",

trusted:
true,

refinementState:
[
"intelligence refinement accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});


assert.equal(
maturation.trusted,
true
);


assert.equal(
maturation.maturationState.length > 0,
true
);

}
);


test(
"blocks intelligence maturation from untrusted intelligence refinement",
() => {

const maturation =
createExecutionIntelligenceMaturation({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe capability",

trusted:
false,

refinementState:
[
"intelligence refinement blocked"
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
maturation.trusted,
false
);


assert.equal(
maturation.blockedReasons.length > 0,
true
);

}
);


test(
"preserves execution intelligence maturation provenance",
() => {

const maturation =
createExecutionIntelligenceMaturation({

version:
"1.0.0",

source:
"test",

objective:
"Provenance test",

trusted:
true,

refinementState:
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
maturation.provenance.length > 0,
true
);

}
);
