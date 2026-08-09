import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceFormation
} from "./execution-intelligence-formation-foundation-engine";

test(
"creates trusted intelligence formation from trusted knowledge integration",
() => {

const formation =
createExecutionIntelligenceFormation({

version:
"1.0.0",

source:
"test",

objective:
"Build capability",

trusted:
true,

integrationState:
[
"knowledge integration accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
formation.trusted,
true
);

assert.equal(
formation.intelligenceState.length > 0,
true
);

}
);

test(
"blocks intelligence formation from untrusted knowledge integration",
() => {

const formation =
createExecutionIntelligenceFormation({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe capability",

trusted:
false,

integrationState:
[
"knowledge integration blocked"
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
formation.trusted,
false
);

assert.equal(
formation.blockedReasons.length > 0,
true
);

}
);

test(
"preserves execution intelligence formation provenance",
() => {

const formation =
createExecutionIntelligenceFormation({

version:
"1.0.0",

source:
"test",

objective:
"Provenance test",

trusted:
true,

integrationState:
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
formation.provenance.length > 0,
true
);

}
);
