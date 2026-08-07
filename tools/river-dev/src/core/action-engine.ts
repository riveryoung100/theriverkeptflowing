import type {
RiverDevExecutionAction,
RiverDevExecutionRunner,
RiverDevActionStep
} from "../types";

export function createExecutionAction(
runner:
RiverDevExecutionRunner
):
RiverDevExecutionAction {

const actions =
runner.steps.map(
(step):
RiverDevActionStep =>
({
taskId:
step.taskId,

state:
step.state,

reason:
step.reason

})
);

const blockedReasons =
actions
.filter(
(action) =>
action.state === "blocked"
)
.map(
(action) =>
action.reason
);

return {

version:
"1.0.0",

objective:
runner.objective,

ready:
runner.ready &&
actions.every(
(action) =>
action.state === "executable"
),

actions,

blockedReasons

};

}
