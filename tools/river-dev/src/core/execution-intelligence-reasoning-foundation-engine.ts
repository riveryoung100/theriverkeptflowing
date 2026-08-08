import type {
RiverDevExecutionIntelligenceInterpretationFoundation,
RiverDevExecutionIntelligenceReasoningFoundation
} from "../types";

export function createExecutionIntelligenceReasoning(
interpretation:
RiverDevExecutionIntelligenceInterpretationFoundation
):
RiverDevExecutionIntelligenceReasoningFoundation {


const reasoned =
interpretation.approved === true;


return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-reasoning",

objective:
interpretation.objective,

trusted:
reasoned,

reasoned,

approved:
reasoned,


reasoning:
reasoned
?
[
"execution evaluation accepted",
"execution intelligence relationships reasoned",
"governed reasoning state prepared"
]
:
[
"reasoning generation blocked",
"execution intelligence evaluation not approved",
"review required before reasoning"
],


provenance:
reasoned
?
[
"execution evaluation verified",
"reasoning provenance preserved",
"execution intelligence boundary maintained"
]
:
[
"execution evaluation rejected",
"reasoning boundary maintained"
],


blockedReasons:
reasoned
?
[]
:
[
"execution intelligence evaluation not approved"
]

};

}
