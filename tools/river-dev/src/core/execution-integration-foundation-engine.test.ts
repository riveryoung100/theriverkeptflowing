import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionIntegration
} from "./execution-integration-foundation-engine";


test(
"creates trusted integration from trusted consolidation",
() => {

const integration =
createExecutionIntegration({

version:
"1.0.0",

source:
"test",

objective:
"execute governed flow",

trusted:
true,

consolidationState:
[
"consolidation completed"
],

provenance:
[
"verified"
],

blockedReasons:
[]

});

assert.equal(
integration.trusted,
true
);

assert.equal(
integration.integrationState.length > 0,
true
);

}
);


test(
"blocks integration from untrusted consolidation",
() => {

const integration =
createExecutionIntegration({

version:
"1.0.0",

source:
"test",

objective:
"blocked flow",

trusted:
false,

consolidationState:
[
"consolidation blocked"
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
integration.trusted,
false
);

assert.equal(
integration.blockedReasons.length > 0,
true
);

}
);


test(
"preserves execution integration provenance",
() => {

const integration =
createExecutionIntegration({

version:
"1.0.0",

source:
"test",

objective:
"provenance chain",

trusted:
true,

consolidationState:
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
integration.provenance.length > 0,
true
);

}
);

