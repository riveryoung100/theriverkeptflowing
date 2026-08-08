import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligenceRestoration
} from "./lifecycle-intelligence-restoration-foundation-engine";

test(
"creates trusted restoration from trusted recovery",
() => {

const restoration =
createLifecycleIntelligenceRestoration(
{
version:
"1.0.0",

objective:
"Restoration test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-persistence",

recovery:
[
{
taskId:
"recovery-boundary",

state:
"recovered",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
restoration.version,
"1.0.0"
);

assert.equal(
restoration.trusted,
true
);

assert.equal(
restoration.restoration[0]!.taskId,
"recovery-boundary"
);

assert.equal(
restoration.restoration[0]!.state,
"restored"
);

assert.equal(
restoration.source,
"controlled-execution-lifecycle-intelligence-recovery"
);

}
);

test(
"blocks restoration from blocked recovery",
() => {

const restoration =
createLifecycleIntelligenceRestoration(
{
version:
"1.0.0",

objective:
"Blocked restoration test",

trusted:
false,

source:
"controlled-execution-lifecycle-intelligence-persistence",

recovery:
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
restoration.trusted,
false
);

assert.equal(
restoration.restoration[0]!.state,
"blocked"
);

assert.equal(
restoration.blockedReasons.length,
1
);

}
);

test(
"preserves recovery provenance in restoration",
() => {

const restoration =
createLifecycleIntelligenceRestoration(
{
version:
"1.0.0",

objective:
"Provenance restoration test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-persistence",

recovery:
[
{
taskId:
"final-review",

state:
"recovered",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
restoration.restoration[0]!.reason,
"human verified"
);

}
);
