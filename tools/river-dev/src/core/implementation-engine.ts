import type {
RiverDevExecutionImplementation,
RiverDevExecutionAuthorization,
RiverDevImplementationStep
} from "../types";

export function createExecutionImplementation(
authorization:
RiverDevExecutionAuthorization
):
RiverDevExecutionImplementation {

const implementations =
authorization.authorizations.map(
(step):
RiverDevImplementationStep =>
({

taskId:
step.taskId,

state:
step.state === "blocked"
? "blocked"
: step.state === "confirmation-required"
? "confirmation-required"
: "ready",

reason:
step.reason

})
);

const blockedReasons =
implementations
.filter(
(implementation) =>
implementation.state === "blocked"
)
.map(
(implementation) =>
implementation.reason
);

return {

version:
"1.0.0",

objective:
authorization.objective,

ready:
authorization.authorized &&
implementations.every(
(implementation) =>
implementation.state === "ready"
),

implementations,

blockedReasons

};

}
