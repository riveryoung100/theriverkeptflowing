import type {
RiverDevExecutionApproval,
RiverDevExecutionCompletion
} from "../types";

export function createExecutionCompletion(
approval:
RiverDevExecutionApproval
):
RiverDevExecutionCompletion {

const blocked =
approval.approved === false ||
approval.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
approval.objective,

completed:
!blocked,

source:
"controlled-execution-approval",

completion:
approval.approvals.map(
(step) =>
({
taskId:
step.taskId,

state:
blocked
? "blocked"
: "completed",

reason:
step.reason
})
),

blockedReasons:
approval.blockedReasons

};

}
