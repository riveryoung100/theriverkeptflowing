import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceCoordination
} from "./execution-intelligence-coordination-foundation-engine";

test(
"creates trusted intelligence coordination from trusted intelligence integration",
() => {

const coordination =
createExecutionIntelligenceCoordination({

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
"intelligence integration accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
coordination.trusted,
true
);

assert.equal(
coordination.coordinationState.length > 0,
true
);

}
);

test(
"blocks intelligence coordination from untrusted intelligence integration",
() => {

const coordination =
createExecutionIntelligenceCoordination({

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
"intelligence integration blocked"
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
coordination.trusted,
false
);

assert.equal(
coordination.blockedReasons.length > 0,
true
);

}
);

test(
"preserves execution intelligence coordination provenance",
() => {

const coordination =
createExecutionIntelligenceCoordination({

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
coordination.provenance.length > 0,
true
);

}
);
