import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceOrchestration
} from "./execution-intelligence-orchestration-foundation-engine";

test(
"creates trusted intelligence orchestration from trusted intelligence coordination",
() => {

const orchestration =
createExecutionIntelligenceOrchestration({

version:
"1.0.0",

source:
"test",

objective:
"Build capability",

trusted:
true,

coordinationState:
[
"intelligence coordination accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
orchestration.orchestrated,
true
);

assert.equal(
orchestration.authorized,
true
);

assert.equal(
orchestration.pipeline.length > 0,
true
);

}
);


test(
"blocks intelligence orchestration from untrusted intelligence coordination",
() => {

const orchestration =
createExecutionIntelligenceOrchestration({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe capability",

trusted:
false,

coordinationState:
[
"intelligence coordination blocked"
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
orchestration.orchestrated,
false
);

assert.equal(
orchestration.authorized,
false
);

assert.equal(
orchestration.blockedReasons.length > 0,
true
);

}
);


test(
"preserves execution intelligence orchestration provenance",
() => {

const orchestration =
createExecutionIntelligenceOrchestration({

version:
"1.0.0",

source:
"test",

objective:
"Provenance test",

trusted:
true,

coordinationState:
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
orchestration.provenance.length > 0,
true
);

}
);
