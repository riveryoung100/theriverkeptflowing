import type {
RiverDevExecutionOrchestrator,
RiverDevOrchestratorStep,
RiverDevReviewBoundary
} from "../types";

export function createExecutionOrchestrator(
reviewBoundary:
RiverDevReviewBoundary
):
RiverDevExecutionOrchestrator {

const steps =
reviewBoundary.reviews.map(
(review):
RiverDevOrchestratorStep =>
({

name:
review.taskId,

state:
review.state === "blocked"
? "blocked"
: review.state === "confirmation-required"
? "confirmation-required"
: "complete",

reason:
review.reason

})
);

const blockedReasons =
steps
.filter(
(step) =>
step.state === "blocked"
)
.map(
(step) =>
step.reason
);

return {

version:
"1.0.0",

objective:
reviewBoundary.objective,

executable:
reviewBoundary.completed &&
steps.every(
(step) =>
step.state === "complete"
),

steps,

blockedReasons

};

}
