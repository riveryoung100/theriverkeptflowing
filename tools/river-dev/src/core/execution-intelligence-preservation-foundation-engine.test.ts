import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligencePreservation
} from "./execution-intelligence-preservation-foundation-engine";

test(
"creates trusted intelligence preservation from trusted intelligence persistence",
() => {

const preservation =
createExecutionIntelligencePreservation({

version:
"1.0.0",

source:
"test",

objective:
"Build capability",

trusted:
true,

persistenceState:
[
"intelligence persistence accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
preservation.trusted,
true
);

assert.equal(
preservation.preservationState.length > 0,
true
);

}
);

test(
"blocks intelligence preservation from untrusted intelligence persistence",
() => {

const preservation =
createExecutionIntelligencePreservation({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe capability",

trusted:
false,

persistenceState:
[
"intelligence persistence blocked"
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
preservation.trusted,
false
);

assert.equal(
preservation.blockedReasons.length > 0,
true
);

}
);

test(
"preserves execution intelligence preservation provenance",
() => {

const preservation =
createExecutionIntelligencePreservation({

version:
"1.0.0",

source:
"test",

objective:
"Provenance test",

trusted:
true,

persistenceState:
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
preservation.provenance.length > 0,
true
);

}
);
