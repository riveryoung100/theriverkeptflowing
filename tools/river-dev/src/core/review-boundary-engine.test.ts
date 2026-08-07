import assert from "node:assert/strict";
import test from "node:test";

import {
createReviewBoundary
} from "./review-boundary-engine";

test(
"creates completed review boundary from permitted commit boundary",
() => {

const review =
createReviewBoundary(
{
version:
"1.0.0",

objective:
"Review boundary test",

permitted:
true,

commits: [

{
taskId:
"task-1",

state:
"authorized",

reason:
"commit authorized"

}

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
review.reviews[0]!.state,
"approved"
);

assert.equal(
review.completed,
true
);

}
);

test(
"blocks review boundary from blocked commit boundary",
() => {

const review =
createReviewBoundary(
{
version:
"1.0.0",

objective:
"Blocked review boundary test",

permitted:
false,

commits: [

{
taskId:
"task-1",

state:
"blocked",

reason:
"commit blocked"

}

],

blockedReasons:
[
"commit blocked"
]

}
);

assert.equal(
review.completed,
false
);

assert.equal(
review.reviews[0]!.state,
"blocked"
);

assert.equal(
review.blockedReasons.length,
1
);

}
);

test(
"requires confirmation for gated commit boundary",
() => {

const review =
createReviewBoundary(
{
version:
"1.0.0",

objective:
"Confirmation review boundary test",

permitted:
false,

commits: [

{
taskId:
"task-1",

state:
"confirmation-required",

reason:
"awaiting confirmation"

}

],

blockedReasons:
[]

}
);

assert.equal(
review.completed,
false
);

assert.equal(
review.reviews[0]!.state,
"confirmation-required"
);

}
);
