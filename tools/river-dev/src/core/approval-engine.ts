import type {
RiverDevExecutionApproval,
RiverDevExecutionPolicy,
RiverDevApprovalStep
} from "../types";

export function createExecutionApproval(
policy:
RiverDevExecutionPolicy
):
RiverDevExecutionApproval {

const approvals =
policy.policies.map(
(step):
RiverDevApprovalStep =>
({

taskId:
step.taskId,

state:
step.state === "blocked"
? "blocked"
: step.state === "review-required"
? "pending-review"
: "approved",

reason:
step.reason

})
);

const blockedReasons =
approvals
.filter(
(approval) =>
approval.state === "blocked"
)
.map(
(approval) =>
approval.reason
);

return {

version:
"1.0.0",

objective:
policy.objective,

approved:
policy.allowed &&
approvals.every(
(approval) =>
approval.state === "approved"
),

approvals,

blockedReasons

};

}
