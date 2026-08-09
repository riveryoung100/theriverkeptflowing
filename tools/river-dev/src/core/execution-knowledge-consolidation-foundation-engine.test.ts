import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionKnowledgeConsolidation
} from "./execution-knowledge-consolidation-foundation-engine";


test(
"creates trusted knowledge consolidation from trusted knowledge formation",
() => {

const consolidation =
createExecutionKnowledgeConsolidation({

version:
"1.0.0",

source:
"test",

objective:
"Build capability",

trusted:
true,

knowledgeState:
[
"knowledge accepted"
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
"blocks knowledge consolidation from untrusted knowledge formation",
() => {

const consolidation =
createExecutionKnowledgeConsolidation({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe capability",

trusted:
false,

knowledgeState:
[
"knowledge blocked"
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
"preserves execution knowledge consolidation provenance",
() => {

const consolidation =
createExecutionKnowledgeConsolidation({

version:
"1.0.0",

source:
"test",

objective:
"Provenance test",

trusted:
true,

knowledgeState:
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
