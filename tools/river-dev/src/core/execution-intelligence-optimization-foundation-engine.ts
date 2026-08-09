import type {
RiverDevExecutionIntelligenceAdaptationFoundation,
RiverDevExecutionIntelligenceOptimizationFoundation
} from "../types";

export function createExecutionIntelligenceOptimization(
adaptation:
RiverDevExecutionIntelligenceAdaptationFoundation
):
RiverDevExecutionIntelligenceOptimizationFoundation {

const trusted =
adaptation.trusted === true &&
adaptation.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-optimization",

objective:
adaptation.objective,

trusted,

optimizationState:
trusted
?
[
"intelligence adaptation record accepted",
"intelligence optimization created",
"controlled intelligence boundary preserved"
]
:
[
"intelligence optimization restricted",
"intelligence adaptation review required"
],

provenance:
trusted
?
[
"intelligence adaptation verified",
"optimization provenance preserved",
"human authorization boundary maintained"
]
:
[
"intelligence adaptation state preserved",
"optimization boundary maintained"
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
