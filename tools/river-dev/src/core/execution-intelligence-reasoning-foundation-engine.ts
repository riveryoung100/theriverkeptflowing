import type {
RiverDevExecutionIntelligenceEvaluationFoundation,
RiverDevExecutionIntelligenceReasoningFoundation
} from "../types";

export function createExecutionIntelligenceReasoning(
evaluation:
RiverDevExecutionIntelligenceEvaluationFoundation
):
RiverDevExecutionIntelligenceReasoningFoundation {

const trusted =
evaluation.approved === true
&& evaluation.understood === true;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-reasoning",

objective:
evaluation.objective,

trusted,

reasoning:
trusted
?
[
"execution evaluation accepted",
"approved intelligence interpreted",
"governed execution reasoning prepared"
]
:
[
"execution reasoning halted",
"evaluation approval missing",
"authorization review required"
],

provenance:
trusted
?
[
"execution evaluation verified",
"reasoning boundary maintained",
"decision context preserved"
]
:
[
"blocked evaluation state recorded",
"reasoning halted safely"
],

blockedReasons:
trusted
?
[]
:
[
"execution intelligence evaluation not approved"
]

};

}
