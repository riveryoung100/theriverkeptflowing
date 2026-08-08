import type {
RiverDevExecutionReporting,
RiverDevExecutionContinuation
} from "../types";

export function createExecutionContinuation(
report:
RiverDevExecutionReporting
):
RiverDevExecutionContinuation {

const authorized =
report.authorized === true &&
report.reportState === "successful";

return {

version:
"1.0.0",

source:
"river-development-agent-execution-continuation",

objective:
report.objective,

reportingSource:
"river-development-agent-execution-reporting",

continuationState:
authorized
?
"continue"
:
"halt",

continuationActions:
authorized
?
[
"continue governed execution flow",
"preserve execution context",
"prepare next controlled action"
]
:
[
"halt continuation flow",
"preserve blocked report state",
"request authorization review"
],

validationSummary:
[
"verify reporting provenance",
"confirm authorization state",
"preserve deterministic continuation"
],

authorized

};

}
