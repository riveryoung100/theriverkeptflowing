import type {
RiverDevExecutionCompletion,
RiverDevExecutionLifecycle
} from "../types";

export function createExecutionLifecycle(
completion:
RiverDevExecutionCompletion
):
RiverDevExecutionLifecycle {

const blocked =
completion.completed === false ||
completion.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
completion.objective,

active:
!blocked,

source:
"controlled-execution-completion",

lifecycle:
completion.completion.map(
(step) =>
({
taskId:
step.taskId,

state:
blocked
? "blocked"
: "active",

reason:
step.reason
})
),

blockedReasons:
completion.blockedReasons

};

}
