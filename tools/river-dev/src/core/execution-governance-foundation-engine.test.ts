import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionGovernance
} from "./execution-governance-foundation-engine";

test(
"creates trusted governance from trusted evolution",
() => {

const governance =
createExecutionGovernance({

version:
"1.0.0",

source:
"test",

objective:
"execute repository change",

trusted:
true,

evolutionState:
[
"evolution accepted"
],

provenance:
[
"evolution verified"
],

blockedReasons:
[]

});

assert.equal(
governance.trusted,
true
);

assert.equal(
governance.governanceState.length > 0,
true
);

});

test(
"blocks governance from untrusted evolution",
() => {

const governance =
createExecutionGovernance({

version:
"1.0.0",

source:
"test",

objective:
"execute repository change",

trusted:
false,

evolutionState:
[
"evolution blocked"
],

provenance:
[
"evolution preserved"
],

blockedReasons:
[
"evolution not trusted"
]

});

assert.equal(
governance.trusted,
false
);

assert.equal(
governance.blockedReasons.length > 0,
true
);

});

test(
"preserves execution governance provenance",
() => {

const governance =
createExecutionGovernance({

version:
"1.0.0",

source:
"test",

objective:
"validate governance chain",

trusted:
true,

evolutionState:
[
"validated"
],

provenance:
[
"evolution verified"
],

blockedReasons:
[]

});

assert.equal(
governance.provenance.length > 0,
true
);

});
