import type {
RiverDevExecutionChangeValidation,
RiverDevExecutionChangePlan,
RiverDevValidationStep
} from "../types";

export function createExecutionChangeValidation(
plan:
RiverDevExecutionChangePlan
):
RiverDevExecutionChangeValidation {

const validations =
plan.changes.map(
(step):
RiverDevValidationStep =>
({

taskId:
step.taskId,

state:
step.state === "blocked"
? "blocked"
: step.state === "confirmation-required"
? "confirmation-required"
: "validated",

reason:
step.reason

})
);

const blockedReasons =
validations
.filter(
(validation) =>
validation.state === "blocked"
)
.map(
(validation) =>
validation.reason
);

return {

version:
"1.0.0",

objective:
plan.objective,

valid:
plan.executable &&
validations.every(
(validation) =>
validation.state === "validated"
),

validations,

blockedReasons

};

}
