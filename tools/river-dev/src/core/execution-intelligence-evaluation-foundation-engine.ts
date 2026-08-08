import type {
RiverDevExecutionIntelligenceFoundation,
RiverDevExecutionIntelligenceEvaluationFoundation
} from "../types";

export function createExecutionIntelligenceEvaluation(
intelligence:
RiverDevExecutionIntelligenceFoundation
):
RiverDevExecutionIntelligenceEvaluationFoundation {

const approved =
intelligence.decision === "approved"
&& intelligence.understood === true;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-evaluation",

objective:
intelligence.objective,

approved,

understood:
intelligence.understood,

evaluation:
approved
?
[
"execution intelligence approved",
"execution authorization confirmed",
"controlled evaluation completed"
]
:
[
"execution intelligence blocked",
"approval requirements not satisfied",
"authorization review required"
],

provenance:
approved
?
[
"execution intelligence verified",
"evaluation boundary maintained",
"decision provenance preserved"
]
:
[
"blocked intelligence state recorded",
"evaluation halted safely"
],

blockedReasons:
approved
?
[]
:
[
"execution intelligence not approved"
]

};

}
