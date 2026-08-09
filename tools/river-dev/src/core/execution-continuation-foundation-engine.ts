import type {
RiverDevExecutionContinuationReport,
RiverDevExecutionContinuationFoundation
} from "../types";


export function createExecutionContinuation(
report:
RiverDevExecutionContinuationReport
):
RiverDevExecutionContinuationFoundation {


const canContinue =
report.reportState === "successful" &&
report.authorized === true;


return {

version:
"1.0.0",

source:
"river-development-agent-execution-continuation",

objective:
report.objective,

continuationState:
canContinue
?
"continue"
:
"halt",

authorized:
report.authorized,

continuationActions:
canContinue
?
[
"continue governed execution flow"
]
:
[
"halt continuation flow"
],

reportingSource:
"river-development-agent-execution-reporting",

provenance:
[
"execution reporting evaluated",
"continuation decision preserved"
],

blockedReasons:
canContinue
?
[]
:
[
"execution reporting blocked continuation"
]

};

}

