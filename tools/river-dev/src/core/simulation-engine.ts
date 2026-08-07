import type {
RiverDevExecutionSimulation,
RiverDevExecutionSession,
RiverDevSimulationStep
} from "../types";

export function createExecutionSimulation(
session:
RiverDevExecutionSession
):
RiverDevExecutionSimulation {

const steps =
session.approvals.map(
(approval):
RiverDevSimulationStep =>
({

taskId:
approval.taskId,

state:
approval.state === "rejected"
? "blocked"
: approval.state === "pending"
? "approval-required"
: "simulated",

reason:
approval.reason

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
session.objective,

ready:
session.ready &&
steps.every(
(step) =>
step.state === "simulated"
),

steps,

blockedReasons

};

}
