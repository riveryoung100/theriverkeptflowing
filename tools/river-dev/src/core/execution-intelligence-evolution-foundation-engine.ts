import type {
RiverDevExecutionIntelligenceCompletionFoundation,
RiverDevExecutionIntelligenceEvolutionFoundation
} from "../types";

export function createExecutionIntelligenceEvolution(
completion:
RiverDevExecutionIntelligenceCompletionFoundation
):
RiverDevExecutionIntelligenceEvolutionFoundation {

const trusted =
completion.trusted === true &&
completion.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-evolution",

objective:
completion.objective,

trusted,

evolutionState:
trusted
?
[
"intelligence completion record accepted",
"intelligence evolution created",
"controlled intelligence boundary preserved"
]
:
[
"intelligence evolution restricted",
"intelligence completion review required"
],

provenance:
trusted
?
[
"intelligence completion verified",
"evolution provenance preserved",
"human authorization boundary maintained"
]
:
[
"intelligence completion state preserved",
"evolution boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"intelligence completion not trusted"
]

};

}
