import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceOversight
} from "./execution-intelligence-oversight-foundation-engine";

test(
"creates trusted intelligence oversight from trusted intelligence audit",
() => {

const oversight =
createExecutionIntelligenceOversight({

version:
"1.0.0",

source:
"test",

objective:
"Build capability",

trusted:
true,

auditState:
[
"intelligence audit accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
oversight.trusted,
true
);

assert.equal(
oversight.oversightState.length > 0,
true
);

}
);

test(
"blocks intelligence oversight from untrusted intelligence audit",
() => {

const oversight =
createExecutionIntelligenceOversight({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe capability",

trusted:
false,

auditState:
[
"intelligence audit blocked"
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
oversight.trusted,
false
);

assert.equal(
oversight.blockedReasons.length > 0,
true
);

}
);

test(
"preserves execution intelligence oversight provenance",
() => {

const oversight =
createExecutionIntelligenceOversight({

version:
"1.0.0",

source:
"test",

objective:
"Provenance test",

trusted:
true,

auditState:
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
oversight.provenance.length > 0,
true
);

}
);
