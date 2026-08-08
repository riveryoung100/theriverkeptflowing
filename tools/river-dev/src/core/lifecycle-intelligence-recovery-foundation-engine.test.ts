import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligenceRecovery
} from "./lifecycle-intelligence-recovery-foundation-engine";

test(
"creates trusted recovery from trusted persistence",
() => {

const recovery =
createLifecycleIntelligenceRecovery(
{
version:
"1.0.0",

objective:
"Recovery test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-continuity",

persistence:
[
{
taskId:
"persistence-boundary",

state:
"persisted",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
recovery.version,
"1.0.0"
);

assert.equal(
recovery.trusted,
true
);

assert.equal(
recovery.recovery[0]!.taskId,
"persistence-boundary"
);

assert.equal(
recovery.recovery[0]!.state,
"recovered"
);

assert.equal(
recovery.source,
"controlled-execution-lifecycle-intelligence-persistence"
);

}
);

test(
"blocks recovery from blocked persistence",
() => {

const recovery =
createLifecycleIntelligenceRecovery(
{
version:
"1.0.0",

objective:
"Blocked recovery test",

trusted:
false,

source:
"controlled-execution-lifecycle-intelligence-continuity",

persistence:
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
recovery.trusted,
false
);

assert.equal(
recovery.recovery[0]!.state,
"blocked"
);

assert.equal(
recovery.blockedReasons.length,
1
);

}
);

test(
"preserves persistence provenance in recovery",
() => {

const recovery =
createLifecycleIntelligenceRecovery(
{
version:
"1.0.0",

objective:
"Provenance recovery test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-continuity",

persistence:
[
{
taskId:
"final-review",

state:
"persisted",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
recovery.recovery[0]!.reason,
"human verified"
);

}
);
