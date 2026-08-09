import type {
RiverDevExecutionIntelligenceEvolutionFoundation,
RiverDevExecutionIntelligenceCompletionFoundation
} from "../types";

export function createExecutionIntelligenceCompletion(
evolution:
RiverDevExecutionIntelligenceEvolutionFoundation
):
RiverDevExecutionIntelligenceCompletionFoundation {

const trusted =
evolution.trusted === true &&
evolution.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-completion",

objective:
evolution.objective,

trusted,

completionState:
trusted
?
[
"intelligence evolution record accepted",
"intelligence completion created",
"controlled intelligence lifecycle preserved"
]
:
[
"intelligence completion restricted",
"intelligence evolution review required"
],

provenance:
trusted
?
[
"intelligence evolution verified",
"completion provenance preserved",
"human authorization boundary maintained"
]
:
[
"intelligence evolution state preserved",
"completion boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"intelligence evolution not trusted"
]

};

}
