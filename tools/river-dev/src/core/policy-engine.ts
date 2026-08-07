import type {
RiverDevExecutionPolicy,
RiverDevExecutionGovernance,
RiverDevPolicyStep
} from "../types";

export function createExecutionPolicy(
governance:
RiverDevExecutionGovernance
):
RiverDevExecutionPolicy {

const policies =
governance.decisions.map(
(step):
RiverDevPolicyStep =>
({

taskId:
step.taskId,

state:
step.state === "blocked"
? "blocked"
: step.state === "review-required"
? "review-required"
: "allowed",

reason:
step.reason

})
);

const blockedReasons =
policies
.filter(
(policy) =>
policy.state === "blocked"
)
.map(
(policy) =>
policy.reason
);

return {

version:
"1.0.0",

objective:
governance.objective,

allowed:
governance.approved &&
policies.every(
(policy) =>
policy.state === "allowed"
),

policies,

blockedReasons

};

}
