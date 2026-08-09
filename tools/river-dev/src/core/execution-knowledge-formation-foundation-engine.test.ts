import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionKnowledgeFormation
} from "./execution-knowledge-formation-foundation-engine";

test(
"creates trusted knowledge formation from trusted learning integration",
() => {

const formation =
createExecutionKnowledgeFormation({

version:
"1.0.0",

source:
"test",

objective:
"Build capability",

trusted:
true,

learningState:
[
"learning accepted"
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
formation.knowledgeState.length > 0,
true
);

}
);


test(
"blocks knowledge formation from untrusted learning integration",
() => {

const formation =
createExecutionKnowledgeFormation({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe capability",

trusted:
false,

learningState:
[
"learning blocked"
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
"preserves execution knowledge formation provenance",
() => {

const formation =
createExecutionKnowledgeFormation({

version:
"1.0.0",

source:
"test",

objective:
"Provenance test",

trusted:
true,

learningState:
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
