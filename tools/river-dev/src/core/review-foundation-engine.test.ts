import assert from "node:assert/strict";
import test from "node:test";

import {
createExecutionReview
} from "./review-foundation-engine";

test(
"creates approved reviews from successful results",
() => {

const review =
createExecutionReview(
{
version:
"1.0.0",

objective:
"Review test",

ready:
true,

results:
[
{
taskId:
"boundary",

state:
"successful",

reason:
"completed"
}
],

trusted:
true,

status:
"success",

source:
"controlled-execution-workflow-runtime",

details:
[
"boundary:ready"
],

blockedReasons:
[]

}
);

assert.equal(
review.version,
"1.0.0"
);

assert.equal(
review.approved,
true
);

assert.equal(
review.findings[0],
"boundary:successful"
);

assert.equal(
review.source,
"controlled-execution-result"
);

}
);


test(
"blocks reviews from blocked results",
() => {

const review =
createExecutionReview(
{
version:
"1.0.0",

objective:
"Blocked review test",

ready:
false,

results:
[
{
taskId:
"decision",

state:
"blocked",

reason:
"approval required"
}
],

trusted:
false,

status:
"blocked",

source:
"controlled-execution-workflow-runtime",

details:
[
"decision:blocked"
],

blockedReasons:
[
"approval required"
]

}
);

assert.equal(
review.approved,
false
);

assert.equal(
review.blockedReasons.length,
1
);

}
);


test(
"preserves result provenance in review",
() => {

const review =
createExecutionReview(
{
version:
"1.0.0",

objective:
"Source review test",

ready:
true,

results:
[
{
taskId:
"approval",

state:
"successful",

reason:
"verified"
}
],

trusted:
true,

status:
"success",

source:
"controlled-execution-workflow-runtime",

details:
[
"approval:ready"
],

blockedReasons:
[]

}
);

assert.equal(
review.findings[0],
"approval:successful"
);

}
);
