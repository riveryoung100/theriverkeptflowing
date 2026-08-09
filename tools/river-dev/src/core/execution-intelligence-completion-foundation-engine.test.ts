import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceCompletion
} from "./execution-intelligence-completion-foundation-engine";

test(
"creates trusted intelligence completion from trusted intelligence certification",
() => {

const completion =
createExecutionIntelligenceCompletion({

version:
"1.0.0",

source:
"test",

objective:
"Build capability",

trusted:
true,

certificationState:
[
"intelligence certification accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
completion.trusted,
true
);

assert.equal(
completion.completionState.length > 0,
true
);

}
);


test(
"blocks intelligence completion from untrusted intelligence certification",
() => {

const completion =
createExecutionIntelligenceCompletion({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe capability",

trusted:
false,

certificationState:
[
"intelligence certification blocked"
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
completion.trusted,
false
);

assert.equal(
completion.blockedReasons.length > 0,
true
);

}
);


test(
"preserves execution intelligence completion provenance",
() => {

const completion =
createExecutionIntelligenceCompletion({

version:
"1.0.0",

source:
"test",

objective:
"Provenance test",

trusted:
true,

certificationState:
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
completion.provenance.length > 0,
true
);

}
);
