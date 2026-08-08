import type {
RiverDevExecutionResult,
RiverDevExecutionWorkflowRuntime
} from "../types";

export function createExecutionResult(
runtime:
RiverDevExecutionWorkflowRuntime
):
RiverDevExecutionResult {

const blockedReasons =
runtime.blockedReasons;

const blocked =
blockedReasons.length > 0 ||
runtime.trusted === false;

return {

version:
"1.0.0",

objective:
runtime.objective,

ready:
!blocked,

results:
runtime.steps.map(
(step) =>
({
taskId:
step.name,

state:
blocked
? "blocked"
: "successful",

reason:
step.status
})
),

trusted:
runtime.trusted &&
!blocked,

status:
blocked
? "blocked"
: "success",

source:
"controlled-execution-workflow-runtime",

details:
runtime.steps.map(
(step) =>
`${step.name}:${step.status}`
),

blockedReasons

};

}

