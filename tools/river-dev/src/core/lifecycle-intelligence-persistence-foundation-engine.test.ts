import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligencePersistence
} from "./lifecycle-intelligence-persistence-foundation-engine";

test(
"creates trusted persistence from trusted continuity",
() => {

const persistence =
createLifecycleIntelligencePersistence(
{
version:
"1.0.0",

objective:
"Persistence test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-resilience",

continuity:
[
{
taskId:
"continuity-boundary",

state:
"continuous",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
persistence.version,
"1.0.0"
);

assert.equal(
persistence.trusted,
true
);

assert.equal(
persistence.persistence[0]!.taskId,
"continuity-boundary"
);

assert.equal(
persistence.persistence[0]!.state,
"persisted"
);

assert.equal(
persistence.source,
"controlled-execution-lifecycle-intelligence-continuity"
);

}
);

test(
"blocks persistence from blocked continuity",
() => {

const persistence =
createLifecycleIntelligencePersistence(
{
version:
"1.0.0",

objective:
"Blocked persistence test",

trusted:
false,

source:
"controlled-execution-lifecycle-intelligence-resilience",

continuity:
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
persistence.trusted,
false
);

assert.equal(
persistence.persistence[0]!.state,
"blocked"
);

assert.equal(
persistence.blockedReasons.length,
1
);

}
);

test(
"preserves continuity provenance in persistence",
() => {

const persistence =
createLifecycleIntelligencePersistence(
{
version:
"1.0.0",

objective:
"Provenance persistence test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-resilience",

continuity:
[
{
taskId:
"final-review",

state:
"continuous",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
persistence.persistence[0]!.reason,
"human verified"
);

}
);
