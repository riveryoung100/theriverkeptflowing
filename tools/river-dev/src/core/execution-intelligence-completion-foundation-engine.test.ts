import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntelligenceCompletion
} from "./execution-intelligence-completion-foundation-engine";


test(
"creates trusted intelligence completion from trusted intelligence evolution",
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

evolutionState:
[
"intelligence evolution accepted"
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
"blocks intelligence completion from untrusted intelligence evolution",
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

evolutionState:
[
"intelligence evolution blocked"
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

evolutionState:
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
