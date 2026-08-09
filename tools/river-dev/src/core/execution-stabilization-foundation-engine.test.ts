import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionStabilization
} from "./execution-stabilization-foundation-engine";

test(
"creates trusted stabilization from trusted integration",
() => {

const stabilization =
createExecutionStabilization({

version:
"1.0.0",

source:
"test",

objective:
"execute governed flow",

trusted:
true,

integrationState:
[
"integration completed"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
stabilization.trusted,
true
);

assert.equal(
stabilization.stabilizationState.length > 0,
true
);

}
);

test(
"blocks stabilization from untrusted integration",
() => {

const stabilization =
createExecutionStabilization({

version:
"1.0.0",

source:
"test",

objective:
"blocked flow",

trusted:
false,

integrationState:
[
"integration blocked"
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
stabilization.trusted,
false
);

assert.equal(
stabilization.blockedReasons.length > 0,
true
);

}
);

test(
"preserves execution stabilization provenance",
() => {

const stabilization =
createExecutionStabilization({

version:
"1.0.0",

source:
"test",

objective:
"provenance chain",

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
stabilization.provenance.length > 0,
true
);

}
);
