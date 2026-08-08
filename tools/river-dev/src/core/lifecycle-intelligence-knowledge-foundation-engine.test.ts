import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligenceKnowledge
} from "./lifecycle-intelligence-knowledge-foundation-engine";

test(
"creates trusted knowledge from trusted learning",
() => {

const knowledge =
createLifecycleIntelligenceKnowledge(
{
version:
"1.0.0",

objective:
"Knowledge test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-feedback",

learning:
[
{
taskId:
"learning-boundary",

state:
"learned",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
knowledge.version,
"1.0.0"
);

assert.equal(
knowledge.trusted,
true
);

assert.equal(
knowledge.knowledge[0]!.taskId,
"learning-boundary"
);

assert.equal(
knowledge.knowledge[0]!.state,
"stored"
);

assert.equal(
knowledge.source,
"controlled-execution-lifecycle-intelligence-learning"
);

}
);

test(
"blocks knowledge from blocked learning",
() => {

const knowledge =
createLifecycleIntelligenceKnowledge(
{
version:
"1.0.0",

objective:
"Blocked knowledge test",

trusted:
false,

source:
"controlled-execution-lifecycle-intelligence-feedback",

learning:
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
knowledge.trusted,
false
);

assert.equal(
knowledge.knowledge[0]!.state,
"blocked"
);

assert.equal(
knowledge.blockedReasons.length,
1
);

}
);

test(
"preserves learning provenance in knowledge",
() => {

const knowledge =
createLifecycleIntelligenceKnowledge(
{
version:
"1.0.0",

objective:
"Provenance knowledge test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-feedback",

learning:
[
{
taskId:
"final-review",

state:
"learned",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
knowledge.knowledge[0]!.reason,
"human verified"
);

}
);
