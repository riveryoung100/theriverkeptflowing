import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionDecision
} from "./execution-decision-foundation-engine";


test(
"creates trusted decision from trusted policy",
() => {

const decision =
createExecutionDecision({

version:
"1.0.0",

source:
"test",

objective:
"execute governed flow",

trusted:
true,

policyState:
[
"policy accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});


assert.equal(
decision.trusted,
true
);

assert.equal(
decision.decisionState.length > 0,
true
);

}
);


test(
"blocks decision from untrusted policy",
() => {

const decision =
createExecutionDecision({

version:
"1.0.0",

source:
"test",

objective:
"blocked flow",

trusted:
false,

policyState:
[
"policy blocked"
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
decision.trusted,
false
);

assert.equal(
decision.blockedReasons.length > 0,
true
);

}
);


test(
"preserves execution decision provenance",
() => {

const decision =
createExecutionDecision({

version:
"1.0.0",

source:
"test",

objective:
"provenance chain",

trusted:
true,

policyState:
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
