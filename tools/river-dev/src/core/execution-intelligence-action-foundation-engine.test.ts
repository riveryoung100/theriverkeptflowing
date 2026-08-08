import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceAction
} from "./execution-intelligence-action-foundation-engine";

test(
"creates authorized actions from approved execution decision",
() => {

const action =
createExecutionIntelligenceAction({

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-decision",

objective:
"Build capability",

approved:
true,

decision:
"execute",

actions:
[
"execute governed implementation"
],

provenance:
[
"decision authorization verified"
],

blockedReasons:
[]

});

assert.equal(
action.authorized,
true
);

assert.equal(
action.objective,
"Build capability"
);

assert.equal(
action.actions[0],
"execute approved governed action"
);

assert.equal(
action.blockedReasons.length,
0
);

}
);


test(
"blocks actions from held execution decision",
() => {

const action =
createExecutionIntelligenceAction({

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-decision",

objective:
"Unsafe capability",

approved:
false,

decision:
"hold",

actions:
[],

provenance:
[
"blocked decision state recorded"
],

blockedReasons:
[
"execution decision not authorized"
]

});

assert.equal(
action.authorized,
false
);

assert.equal(
action.actions.length,
0
);

assert.equal(
action.blockedReasons[0],
"execution decision not authorized"
);

}
);


test(
"preserves action provenance",
() => {

const action =
createExecutionIntelligenceAction({

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-decision",

objective:
"Provenance test",

approved:
true,

decision:
"execute",

actions:
[],

provenance:
[],

blockedReasons:
[]

});

assert.equal(
action.source,
"river-development-agent-execution-intelligence-action"
);

assert.equal(
action.provenance[0],
"decision authorization verified"
);

assert.equal(
action.version,
"1.0.0"
);

}
);
