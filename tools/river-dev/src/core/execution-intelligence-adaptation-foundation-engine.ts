import type {
RiverDevExecutionIntelligenceEvolutionFoundation,
RiverDevExecutionIntelligenceAdaptationFoundation
} from "../types";

export function createExecutionIntelligenceAdaptation(
evolution:
RiverDevExecutionIntelligenceEvolutionFoundation
):
RiverDevExecutionIntelligenceAdaptationFoundation {

const trusted =
evolution.trusted === true &&
evolution.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-adaptation",

objective:
evolution.objective,

trusted,

adaptationState:
trusted
?
[
"intelligence evolution record accepted",
"intelligence adaptation created",
"controlled intelligence boundary preserved"
]
:
[
"intelligence adaptation restricted",
"intelligence evolution review required"
],

provenance:
trusted
?
[
"intelligence evolution verified",
"adaptation provenance preserved",
"human authorization boundary maintained"
]
:
[
"intelligence evolution state preserved",
"adaptation boundary maintained"
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
