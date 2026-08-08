import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligenceReadiness
} from "./lifecycle-intelligence-readiness-foundation-engine";

test(
"creates trusted readiness from trusted activation",
() => {

const readiness =
createLifecycleIntelligenceReadiness(
{
version:
"1.0.0",

objective:
"Readiness test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-restoration",

activation:
[
{
taskId:
"activation-boundary",

state:
"activated",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
readiness.version,
"1.0.0"
);

assert.equal(
readiness.trusted,
true
);

assert.equal(
readiness.readiness[0]!.taskId,
"activation-boundary"
);

assert.equal(
readiness.readiness[0]!.state,
"ready"
);

assert.equal(
readiness.source,
"controlled-execution-lifecycle-intelligence-activation"
);

}
);

test(
"blocks readiness from blocked activation",
() => {

const readiness =
createLifecycleIntelligenceReadiness(
{
version:
"1.0.0",

objective:
"Blocked readiness test",

trusted:
false,

source:
"controlled-execution-lifecycle-intelligence-restoration",

activation:
[
{
taskId:
"authorization",

state:
"blocked",

reason:
"approval required"
}
],

blockedReasons:
[
"approval required"
]

}
);

assert.equal(
readiness.trusted,
false
);

assert.equal(
readiness.readiness[0]!.state,
"blocked"
);

assert.equal(
readiness.blockedReasons.length,
1
);

}
);

test(
"preserves activation provenance in readiness",
() => {

const readiness =
createLifecycleIntelligenceReadiness(
{
version:
"1.0.0",

objective:
"Provenance readiness test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-restoration",

activation:
[
{
taskId:
"final-review",

state:
"activated",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
readiness.readiness[0]!.reason,
"human verified"
);

}
);
