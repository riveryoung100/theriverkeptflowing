import type {
RiverDevExecutionWorkflowRuntime,
RiverDevWorkflowRuntimeStep,
RiverDevExecutionWorkflowOrchestration
} from "../types";

export function createWorkflowRuntime(
orchestration:
RiverDevExecutionWorkflowOrchestration
):
RiverDevExecutionWorkflowRuntime {

const blockedReasons =
orchestration.blockedReasons;

const steps =
(orchestration.orchestrations ?? [])
.flatMap(
(item):
RiverDevWorkflowRuntimeStep[] =>
item.workflows.map(
(workflow):
RiverDevWorkflowRuntimeStep =>
({

name:
workflow,

source:
item.source,

status:
blockedReasons.length > 0
? "blocked"
: "ready"

})
)
);

return {

version:
"1.0.0",

objective:
orchestration.objective,

trusted:
orchestration.trusted &&
blockedReasons.length === 0,

steps,

blockedReasons

};

}
