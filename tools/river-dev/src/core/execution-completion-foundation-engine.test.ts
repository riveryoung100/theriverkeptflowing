import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionCompletion
} from "./execution-completion-foundation-engine";

test(
"creates trusted completion from trusted certification",
() => {

const completion =
createExecutionCompletion({

version:
"1.0.0",

source:
"test",

objective:
"execute governed flow",

trusted:
true,

certificationState:
[
"certification completed"
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
"blocks completion from untrusted certification",
() => {

const completion =
createExecutionCompletion({

version:
"1.0.0",

source:
"test",

objective:
"blocked flow",

trusted:
false,

certificationState:
[
"certification blocked"
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
"preserves execution completion provenance",
() => {

const completion =
createExecutionCompletion({

version:
"1.0.0",

source:
"test",

objective:
"provenance chain",

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
