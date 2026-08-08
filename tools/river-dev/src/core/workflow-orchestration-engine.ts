import type {
RiverDevExecutionWorkflowOrchestration,
RiverDevWorkflowOrchestration,
RiverDevExecutionWorkflow
} from "../types";

export function createExecutionWorkflowOrchestration(
workflow:
RiverDevExecutionWorkflow
):
RiverDevExecutionWorkflowOrchestration {

const orchestrations =
(workflow.workflows ?? []).map(
(item):
RiverDevWorkflowOrchestration =>
({

category:
item.category,

name:
item.name,

description:
item.description,

source:
item.source,

workflows:
[
item.name
]

})
);

const blockedReasons =
(workflow.workflows ?? [])
.filter(
(item) =>
item.description === "do not proceed"
)
.map(
(item) =>
item.description
);

return {

version:
"1.0.0",

objective:
workflow.objective,

trusted:
(workflow.trusted ?? false) &&
blockedReasons.length === 0,

orchestrations,

blockedReasons

};

}
