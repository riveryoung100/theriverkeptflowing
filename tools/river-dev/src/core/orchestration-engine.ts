import type {
RiverDevExecutionWorkflow,
RiverDevValidationResult,
RiverDevExecutionStep
} from "../types";

export function createExecutionWorkflow(
validation:
RiverDevValidationResult,
objective:
string
):
RiverDevExecutionWorkflow {

const steps =
validation.decisions
.map(
(decision, index):
RiverDevExecutionStep =>
({
    id:
        `step-${index + 1}`,

    taskId:
        decision.taskId,

    order:
        index + 1,

    status:
        !decision.valid
        ? "blocked"
        : decision.requiresApproval
        ? "approval-required"
        : "ready",

    reason:
        decision.reason

})
)
.sort(
(a, b) =>
a.order - b.order
);

const blockedReasons =
validation.blockedReasons;

return {

version:
    "1.0.0",

objective,

ready:
    validation.ready,

steps,

blockedReasons

};

}
