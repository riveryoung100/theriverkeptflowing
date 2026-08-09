import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceAction
} from "./execution-intelligence-action-foundation-engine";


test(
"creates authorized action from approved execute decision",
() => {

const action =
createExecutionIntelligenceAction({

version:
"1.0.0",

source:
"test",

objective:
"execute repository change",

approved:
true,

decision:
"execute",

reasoning:
[
"trusted reasoning state"
],

provenance:
[
"decision verified"
],

blockedReasons:
[]

});

assert.equal(
action.authorized,
true
);

assert.equal(
action.actions.length > 0,
true
);

assert.equal(
action.blockedReasons.length,
0
);

});


test(
"blocks action from hold decision",
() => {

const action =
createExecutionIntelligenceAction({

version:
"1.0.0",

source:
"test",

objective:
"execute repository change",

approved:
false,

decision:
"hold",

reasoning:
[
"review required"
],

provenance:
[
"decision preserved"
],

blockedReasons:
[
"decision not approved"
]

});

assert.equal(
action.authorized,
false
);

assert.equal(
action.blockedReasons.length > 0,
true
);

});


test(
"preserves action provenance",
() => {

const action =
createExecutionIntelligenceAction({

version:
"1.0.0",

source:
"test",

objective:
"validate provenance",

approved:
true,

decision:
"execute",

reasoning:
[
"trusted reasoning"
],

provenance:
[
"decision verified"
],

blockedReasons:
[]

});

assert.equal(
action.provenance.length > 0,
true
);

});

