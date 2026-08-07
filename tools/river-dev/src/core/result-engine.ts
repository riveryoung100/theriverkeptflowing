import type {
RiverDevExecutionResult,
RiverDevExecutionDispatcher,
RiverDevResultStep
} from "../types";

export function createExecutionResult(
dispatcher:
RiverDevExecutionDispatcher
):
RiverDevExecutionResult {

const results =
dispatcher.dispatches.map(
(step):
RiverDevResultStep =>
({

taskId:
step.taskId,

state:
step.state === "blocked"
? "blocked"
: step.state === "approval-required"
? "approval-required"
: "successful",

reason:
step.reason

})
);

const blockedReasons =
results
.filter(
(result) =>
result.state === "blocked"
)
.map(
(result) =>
result.reason
);

return {

version:
"1.0.0",

objective:
dispatcher.objective,

ready:
dispatcher.ready &&
results.every(
(result) =>
result.state === "successful"
),

results,

blockedReasons

};

}
