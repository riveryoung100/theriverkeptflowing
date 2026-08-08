import assert from "node:assert/strict";
import test from "node:test";

import {
createLifecycleIntelligenceRecommendation
} from "./lifecycle-intelligence-recommendation-foundation-engine";

test(
"creates trusted recommendation from trusted insight",
() => {

const recommendation =
createLifecycleIntelligenceRecommendation(
{
version:
"1.0.0",

objective:
"Recommendation test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-knowledge",

insight:
[
{
taskId:
"insight-boundary",

state:
"identified",

reason:
"verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
recommendation.version,
"1.0.0"
);

assert.equal(
recommendation.trusted,
true
);

assert.equal(
recommendation.recommendation[0]!.taskId,
"insight-boundary"
);

assert.equal(
recommendation.recommendation[0]!.state,
"recommended"
);

assert.equal(
recommendation.source,
"controlled-execution-lifecycle-intelligence-insight"
);

}
);

test(
"blocks recommendation from blocked insight",
() => {

const recommendation =
createLifecycleIntelligenceRecommendation(
{
version:
"1.0.0",

objective:
"Blocked recommendation test",

trusted:
false,

source:
"controlled-execution-lifecycle-intelligence-knowledge",

insight:
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
recommendation.trusted,
false
);

assert.equal(
recommendation.recommendation[0]!.state,
"blocked"
);

assert.equal(
recommendation.blockedReasons.length,
1
);

}
);

test(
"preserves insight provenance in recommendation",
() => {

const recommendation =
createLifecycleIntelligenceRecommendation(
{
version:
"1.0.0",

objective:
"Provenance recommendation test",

trusted:
true,

source:
"controlled-execution-lifecycle-intelligence-knowledge",

insight:
[
{
taskId:
"final-review",

state:
"identified",

reason:
"human verified"
}
],

blockedReasons:
[]

}
);

assert.equal(
recommendation.recommendation[0]!.reason,
"human verified"
);

}
);
