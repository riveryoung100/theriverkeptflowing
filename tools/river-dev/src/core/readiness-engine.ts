import type {
RiverDevExecutionReadiness,
RiverDevExecutionChangeValidation,
RiverDevReadinessStep
} from "../types";

export function createExecutionReadiness(
validation:
RiverDevExecutionChangeValidation
):
RiverDevExecutionReadiness {

const readiness =
validation.validations.map(
(step):
RiverDevReadinessStep =>
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
readiness
.filter(
(item) =>
item.state === "blocked"
)
.map(
(item) =>
item.reason
);

return {

version:
"1.0.0",

objective:
validation.objective,

ready:
validation.valid &&
readiness.every(
(item) =>
item.state === "ready"
),

readiness,

blockedReasons

};

}
