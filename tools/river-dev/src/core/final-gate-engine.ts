import type {
RiverDevExecutionFinalGate,
RiverDevFinalGateStep,
RiverDevRunAuthorization
} from "../types";

export function createExecutionFinalGate(
authorization:
RiverDevRunAuthorization
):
RiverDevExecutionFinalGate {

const gates =
authorization.authorization.map(
(step):
RiverDevFinalGateStep =>
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
gates
.filter(
(gate) =>
gate.state === "blocked"
)
.map(
(gate) =>
gate.reason
);

return {

version:
"1.0.0",

objective:
authorization.objective,

permitted:
authorization.authorized &&
gates.every(
(gate) =>
gate.state === "approved"
),

gates,

blockedReasons

};

}
