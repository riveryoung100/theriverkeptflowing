import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceConsolidation
} from "./execution-intelligence-consolidation-foundation-engine";

test(
"creates trusted intelligence consolidation from trusted intelligence formation",
() => {

const consolidation =
createExecutionIntelligenceConsolidation({

version:
"1.0.0",

source:
"test",

objective:
"Build capability",

trusted:
true,

intelligenceState:
[
"intelligence formation accepted"
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

}
);

test(
"blocks intelligence consolidation from untrusted intelligence formation",
() => {

const consolidation =
createExecutionIntelligenceConsolidation({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe capability",

trusted:
false,

intelligenceState:
[
"intelligence formation blocked"
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

}
);

test(
"preserves execution intelligence consolidation provenance",
() => {

const consolidation =
createExecutionIntelligenceConsolidation({

version:
"1.0.0",

source:
"test",

objective:
"Provenance test",

trusted:
true,

intelligenceState:
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

}
);
