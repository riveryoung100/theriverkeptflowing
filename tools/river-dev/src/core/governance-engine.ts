import type {
RiverDevExecutionGovernance,
RiverDevExecutionAudit,
RiverDevGovernanceStep
} from "../types";

export function createExecutionGovernance(
audit:
RiverDevExecutionAudit
):
RiverDevExecutionGovernance {

const decisions =
audit.history.map(
(step):
RiverDevGovernanceStep =>
({

taskId:
step.taskId,

state:
step.state === "blocked"
? "blocked"
: step.state === "approval-required"
? "review-required"
: "approved",

reason:
step.reason

})
);

const blockedReasons =
decisions
.filter(
(decision) =>
decision.state === "blocked"
)
.map(
(decision) =>
decision.reason
);

return {

version:
"1.0.0",

objective:
audit.objective,

approved:
audit.complete &&
decisions.every(
(decision) =>
decision.state === "approved"
),

decisions,

blockedReasons

};

}
