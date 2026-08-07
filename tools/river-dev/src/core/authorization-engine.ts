import type {
RiverDevExecutionAuthorization,
RiverDevExecutionApproval,
RiverDevAuthorizationStep
} from "../types";

export function createExecutionAuthorization(
approval:
RiverDevExecutionApproval
):
RiverDevExecutionAuthorization {

const authorizations =
approval.approvals.map(
(step):
RiverDevAuthorizationStep =>
({

taskId:
step.taskId,

state:
step.state === "blocked"
? "blocked"
: step.state === "pending-review"
? "confirmation-required"
: "authorized",

reason:
step.reason

})
);

const blockedReasons =
authorizations
.filter(
(authorization) =>
authorization.state === "blocked"
)
.map(
(authorization) =>
authorization.reason
);

return {

version:
"1.0.0",

objective:
approval.objective,

authorized:
approval.approved &&
authorizations.every(
(authorization) =>
authorization.state === "authorized"
),

authorizations,

blockedReasons

};

}
