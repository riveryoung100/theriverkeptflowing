import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionConsolidation
} from "./execution-consolidation-foundation-engine";


test(
"creates trusted consolidation from trusted reinforcement",
() => {

const consolidation =
createExecutionConsolidation({

version:
"1.0.0",

source:
"test",

objective:
"execute governed flow",

trusted:
true,

reinforcementState:
[
"reinforcement accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});


assert.equal(
consolidation.trusted,
true
);

assert.equal(
consolidation.consolidationState.length > 0,
true
);

});


test(
"blocks consolidation from untrusted reinforcement",
() => {

const consolidation =
createExecutionConsolidation({

version:
"1.0.0",

source:
"test",

objective:
"blocked flow",

trusted:
false,

reinforcementState:
[
"reinforcement blocked"
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
consolidation.trusted,
false
);

assert.equal(
consolidation.blockedReasons.length > 0,
true
);

});


test(
"preserves execution consolidation provenance",
() => {

const consolidation =
createExecutionConsolidation({

version:
"1.0.0",

source:
"test",

objective:
"provenance chain",

trusted:
true,

reinforcementState:
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
consolidation.provenance.length > 0,
true
);

});

