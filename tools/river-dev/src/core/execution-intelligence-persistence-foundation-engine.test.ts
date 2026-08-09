import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligencePersistence
} from "./execution-intelligence-persistence-foundation-engine";

test(
"creates trusted intelligence persistence from trusted intelligence continuation",
() => {

const persistence =
createExecutionIntelligencePersistence({

version:
"1.0.0",

source:
"test",

objective:
"Build capability",

continuing:
true,

continuation:
[
"intelligence continuation accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
persistence.trusted,
true
);

assert.equal(
persistence.persistenceState.length > 0,
true
);

}
);

test(
"blocks intelligence persistence from untrusted intelligence continuation",
() => {

const persistence =
createExecutionIntelligencePersistence({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe capability",

continuing:
false,

continuation:
[
"intelligence continuation blocked"
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
persistence.trusted,
false
);

assert.equal(
persistence.blockedReasons.length > 0,
true
);

}
);

test(
"preserves execution intelligence persistence provenance",
() => {

const persistence =
createExecutionIntelligencePersistence({

version:
"1.0.0",

source:
"test",

objective:
"Provenance test",

continuing:
true,

continuation:
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
persistence.provenance.length > 0,
true
);

}
);
