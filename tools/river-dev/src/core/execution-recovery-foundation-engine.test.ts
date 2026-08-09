import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionRecovery
} from "./execution-recovery-foundation-engine";

test(
"creates trusted recovery from trusted stabilization",
() => {

const recovery =
createExecutionRecovery({

version:
"1.0.0",

source:
"test",

objective:
"execute governed flow",

trusted:
true,

stabilizationState:
[
"stabilization accepted"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
recovery.trusted,
true
);

assert.equal(
recovery.recoveryState.length > 0,
true
);

}
);

test(
"blocks recovery from untrusted stabilization",
() => {

const recovery =
createExecutionRecovery({

version:
"1.0.0",

source:
"test",

objective:
"blocked flow",

trusted:
false,

stabilizationState:
[
"stabilization blocked"
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
recovery.trusted,
false
);

assert.equal(
recovery.blockedReasons.length > 0,
true
);

}
);

test(
"preserves execution recovery provenance",
() => {

const recovery =
createExecutionRecovery({

version:
"1.0.0",

source:
"test",

objective:
"provenance chain",

trusted:
true,

stabilizationState:
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
recovery.provenance.length > 0,
true
);

}
);

