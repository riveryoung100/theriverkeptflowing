import type {
RiverDevExecutionChangePlan,
RiverDevExecutionImplementation,
RiverDevChangeStep
} from "../types";

export function createExecutionChangePlan(
implementation:
RiverDevExecutionImplementation
):
RiverDevExecutionChangePlan {

const changes =
implementation.implementations.map(
(step):
RiverDevChangeStep =>
({

taskId:
step.taskId,

state:
step.state === "blocked"
? "blocked"
: step.state === "confirmation-required"
? "confirmation-required"
: "planned",

reason:
step.reason

})
);

const blockedReasons =
changes
.filter(
(change) =>
change.state === "blocked"
)
.map(
(change) =>
change.reason
);

return {

version:
"1.0.0",

objective:
implementation.objective,

executable:
implementation.ready &&
changes.every(
(change) =>
change.state === "planned"
),

changes,

blockedReasons

};

}
