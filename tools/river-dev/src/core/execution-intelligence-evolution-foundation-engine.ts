import type {
RiverDevExecutionIntelligenceAdaptationFoundation,
RiverDevExecutionIntelligenceEvolutionFoundation
} from "../types";

export function createExecutionIntelligenceEvolution(
adaptation:
RiverDevExecutionIntelligenceAdaptationFoundation
):
RiverDevExecutionIntelligenceEvolutionFoundation {

const trusted =
adaptation.trusted === true &&
adaptation.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-evolution",

objective:
adaptation.objective,

trusted,

evolutionState:
trusted
?
[
"intelligence adaptation record accepted",
"intelligence evolution created",
"controlled intelligence evolution preserved"
]
:
[
"intelligence evolution restricted",
"intelligence adaptation review required"
],

provenance:
trusted
?
[
"intelligence adaptation verified",
"evolution provenance preserved",
"human authorization boundary maintained"
]
:
[
"intelligence adaptation state preserved",
"evolution boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"intelligence adaptation not trusted"
]

};

}
