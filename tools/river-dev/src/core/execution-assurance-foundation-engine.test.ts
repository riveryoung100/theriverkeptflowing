import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionAssurance
} from "./execution-assurance-foundation-engine";

test(
"creates trusted assurance from trusted stabilization",
() => {

const assurance =
createExecutionAssurance({

version:
"1.0.0",

source:
"test",

objective:
"execute governed flow",

trusted:
true,

stabilizationState:
[
"stabilization completed"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
assurance.trusted,
true
);

assert.equal(
assurance.assuranceState.length > 0,
true
);

}
);


test(
"blocks assurance from untrusted stabilization",
() => {

const assurance =
createExecutionAssurance({

version:
"1.0.0",

source:
"test",

objective:
"blocked flow",

trusted:
false,

stabilizationState:
[
"stabilization blocked"
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
assurance.trusted,
false
);

assert.equal(
assurance.blockedReasons.length > 0,
true
);

}
);


test(
"preserves execution assurance provenance",
() => {

const assurance =
createExecutionAssurance({

version:
"1.0.0",

source:
"test",

objective:
"provenance chain",

trusted:
true,

stabilizationState:
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
assurance.provenance.length > 0,
true
);

}
);
