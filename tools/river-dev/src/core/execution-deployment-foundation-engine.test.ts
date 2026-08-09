import test from "node:test";
import assert from "node:assert/strict";

import {
createExecutionDeployment
} from "./execution-deployment-foundation-engine";


test(
"creates trusted deployment from trusted promotion",
() => {

const deployment =
createExecutionDeployment({

version:
"1.0.0",

source:
"test",

objective:
"execute repository change",

trusted:
true,

promotionState:
[
"promotion accepted"
],

provenance:
[
"promotion verified"
],

blockedReasons:
[]

});

assert.equal(
deployment.trusted,
true
);

assert.equal(
deployment.deploymentState.length > 0,
true
);

});


test(
"blocks deployment from untrusted promotion",
() => {

const deployment =
createExecutionDeployment({

version:
"1.0.0",

source:
"test",

objective:
"execute repository change",

trusted:
false,

promotionState:
[
"promotion blocked"
],

provenance:
[
"promotion preserved"
],

blockedReasons:
[
"promotion not trusted"
]

});

assert.equal(
deployment.trusted,
false
);

assert.equal(
deployment.blockedReasons.length > 0,
true
);

});


test(
"preserves execution deployment provenance",
() => {

const deployment =
createExecutionDeployment({

version:
"1.0.0",

source:
"test",

objective:
"validate deployment chain",

trusted:
true,

promotionState:
[
"validated"
],

provenance:
[
"promotion verified"
],

blockedReasons:
[]

});

assert.equal(
deployment.provenance.length > 0,
true
);

});
