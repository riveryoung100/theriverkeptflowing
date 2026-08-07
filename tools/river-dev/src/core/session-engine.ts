import type {
RiverDevExecutionSession,
RiverDevExecutionWorkflow,
RiverDevApprovalState
} from "../types";

export function createExecutionSession(
workflow:
RiverDevExecutionWorkflow
):
RiverDevExecutionSession {

const approvals =
workflow.steps.map(
(step):
RiverDevApprovalState =>
({
taskId:
step.taskId,

state:
step.status === "approval-required"
? "pending"
: step.status === "blocked"
? "rejected"
: "approved",

reason:
step.reason
})
);

const blockedReasons =
workflow.steps
.filter(
(step) =>
step.status === "blocked"
)
.map(
(step) =>
step.reason
);

return {

version:
"1.0.0",

objective:
workflow.objective,

ready:
workflow.ready &&
approvals.every(
(approval) =>
approval.state === "approved"
),

approvals,

blockedReasons

};

}
