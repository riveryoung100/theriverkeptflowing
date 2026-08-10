import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceAction
} from "./execution-intelligence-action-foundation-engine";

test(
"creates authorized execution action from approved intelligence decision",
() => {

const action =
createExecutionIntelligenceAction({

version:
"1.0.0",

source:
"test",

objective:
"Build capability",

approved:
true,

decision:
"execute",

actions:
[
"execute approved operation"
],

provenance:
[
"verified"
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

}
);

test(
"blocks execution action from held intelligence decision",
() => {

const action =
createExecutionIntelligenceAction({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe capability",

approved:
false,

decision:
"hold",

actions:
[
"blocked operation"
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
action.authorized,
false
);

assert.equal(
action.blockedReasons.length > 0,
true
);

}
);

test(
"preserves execution intelligence action provenance",
() => {

const action =
createExecutionIntelligenceAction({

version:
"1.0.0",

source:
"test",

objective:
"Provenance test",

approved:
true,

decision:
"execute",

actions:
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
action.provenance.length > 0,
true
);

}
);
