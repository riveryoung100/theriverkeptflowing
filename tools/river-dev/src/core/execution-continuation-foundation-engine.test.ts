import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionContinuation
} from "./execution-continuation-foundation-engine";


test(
"creates trusted continuation from trusted completion",
() => {

const continuation =
createExecutionContinuation({

version:
"1.0.0",

source:
"test",

objective:
"Build capability",

trusted:
true,

completionState:
[
"completion accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});


assert.equal(
continuation.authorized,
true
);

assert.equal(
continuation.continuationActions.length > 0,
true
);

}
);


test(
"blocks continuation from untrusted completion",
() => {

const continuation =
createExecutionContinuation({

version:
"1.0.0",

source:
"test",

objective:
"Unsafe capability",

trusted:
false,

completionState:
[
"completion blocked"
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
continuation.authorized,
false
);

assert.equal(
continuation.blockedReasons.length > 0,
true
);

}
);


test(
"preserves execution continuation provenance",
() => {

const continuation =
createExecutionContinuation({

version:
"1.0.0",

source:
"test",

objective:
"Provenance test",

trusted:
true,

completionState:
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
continuation.provenance.length > 0,
true
);

}
);
