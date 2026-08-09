import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionRestoration
} from "./execution-restoration-foundation-engine";

test(
"creates trusted restoration from trusted recovery",
() => {

const restoration =
createExecutionRestoration({

version:
"1.0.0",

source:
"test",

objective:
"execute governed flow",

trusted:
true,

recoveryState:
[
"recovery accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
restoration.trusted,
true
);

assert.equal(
restoration.restorationState.length > 0,
true
);

}
);

test(
"blocks restoration from untrusted recovery",
() => {

const restoration =
createExecutionRestoration({

version:
"1.0.0",

source:
"test",

objective:
"blocked flow",

trusted:
false,

recoveryState:
[
"recovery blocked"
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
restoration.trusted,
false
);

assert.equal(
restoration.blockedReasons.length > 0,
true
);

}
);

test(
"preserves execution restoration provenance",
() => {

const restoration =
createExecutionRestoration({

version:
"1.0.0",

source:
"test",

objective:
"provenance chain",

trusted:
true,

recoveryState:
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
restoration.provenance.length > 0,
true
);

}
);

