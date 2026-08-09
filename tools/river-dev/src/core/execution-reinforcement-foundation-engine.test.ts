import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionReinforcement
} from "./execution-reinforcement-foundation-engine";


test(
"creates trusted reinforcement from trusted continuation",
() => {

const reinforcement =
createExecutionReinforcement({

version:
"1.0.0",

source:
"test",

objective:
"execute governed flow",

continuationState:
"continue",

authorized:
true,

continuationActions:
[
"continue governed execution flow"
],

reportingSource:
"test-reporting",

provenance:
[
"verified"
],

blockedReasons:
[]

});


assert.equal(
reinforcement.trusted,
true
);

assert.equal(
reinforcement.reinforcementState.length > 0,
true
);

});


test(
"blocks reinforcement from untrusted continuation",
() => {

const reinforcement =
createExecutionReinforcement({

version:
"1.0.0",

source:
"test",

objective:
"blocked flow",

continuationState:
"halt",

authorized:
false,

continuationActions:
[
"halt continuation flow"
],

reportingSource:
"test-reporting",

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
reinforcement.trusted,
false
);

assert.equal(
reinforcement.blockedReasons.length > 0,
true
);

});


test(
"preserves execution reinforcement provenance",
() => {

const reinforcement =
createExecutionReinforcement({

version:
"1.0.0",

source:
"test",

objective:
"provenance chain",

continuationState:
"continue",

authorized:
true,

continuationActions:
[
"continue governed execution flow"
],

reportingSource:
"test-reporting",

provenance:
[
"verified"
],

blockedReasons:
[]

});


assert.equal(
reinforcement.provenance.length > 0,
true
);

});

