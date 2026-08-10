import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceDecision
} from "./execution-intelligence-decision-foundation-engine";

test(
"creates approved execute decision from trusted intelligence review",
() => {

const decision =
createExecutionIntelligenceDecision({

version:
"1.0.0",

source:
"test",

objective:
"Build capability",

trusted:
true,

reviewState:
[
"intelligence review accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
decision.approved,
true
);

assert.equal(
decision.decision,
"execute"
);

assert.equal(
decision.actions.length > 0,
true
);

}
);


test(
"creates hold decision from untrusted intelligence review",
() => {

const decision =
createExecutionIntelligenceDecision({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe capability",

trusted:
false,

reviewState:
[
"intelligence review blocked"
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
decision.approved,
false
);

assert.equal(
decision.decision,
"hold"
);

assert.equal(
decision.blockedReasons.length > 0,
true
);

}
);


test(
"preserves execution intelligence decision provenance",
() => {

const decision =
createExecutionIntelligenceDecision({

version:
"1.0.0",

source:
"test",

objective:
"Provenance test",

trusted:
true,

reviewState:
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
decision.provenance.length > 0,
true
);

}
);
