import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionKnowledgeIntegration
} from "./execution-knowledge-integration-foundation-engine";

test(
"creates trusted knowledge integration from trusted knowledge consolidation",
() => {

const integration =
createExecutionKnowledgeIntegration({

version:
"1.0.0",

source:
"test",

objective:
"Build capability",

trusted:
true,

consolidationState:
[
"knowledge consolidation accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
integration.trusted,
true
);

assert.equal(
integration.integrationState.length > 0,
true
);

}
);


test(
"blocks knowledge integration from untrusted knowledge consolidation",
() => {

const integration =
createExecutionKnowledgeIntegration({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe capability",

trusted:
false,

consolidationState:
[
"knowledge consolidation blocked"
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
integration.trusted,
false
);

assert.equal(
integration.blockedReasons.length > 0,
true
);

}
);


test(
"preserves execution knowledge integration provenance",
() => {

const integration =
createExecutionKnowledgeIntegration({

version:
"1.0.0",

source:
"test",

objective:
"Provenance test",

trusted:
true,

consolidationState:
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
integration.provenance.length > 0,
true
);

}
);
