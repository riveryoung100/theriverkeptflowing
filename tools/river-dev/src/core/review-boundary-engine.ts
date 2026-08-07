import type {
RiverDevReviewBoundary,
RiverDevReviewBoundaryStep,
RiverDevCommitBoundary
} from "../types";

export function createReviewBoundary(
commitBoundary:
RiverDevCommitBoundary
):
RiverDevReviewBoundary {

const reviews =
commitBoundary.commits.map(
(step):
RiverDevReviewBoundaryStep =>
({

taskId:
step.taskId,

state:
step.state === "blocked"
? "blocked"
: step.state === "confirmation-required"
? "confirmation-required"
: "approved",

reason:
step.reason

})
);

const blockedReasons =
reviews
.filter(
(item) =>
item.state === "blocked"
)
.map(
(item) =>
item.reason
);

return {

version:
"1.0.0",

objective:
commitBoundary.objective,

completed:
commitBoundary.permitted &&
reviews.every(
(item) =>
item.state === "approved"
),

reviews,

blockedReasons

};

}
