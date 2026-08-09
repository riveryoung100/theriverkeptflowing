import type {
RiverDevExecutionIntelligenceOptimizationFoundation,
RiverDevExecutionIntelligenceRefinementFoundation
} from "../types";

export function createExecutionIntelligenceRefinement(
optimization:
RiverDevExecutionIntelligenceOptimizationFoundation
):
RiverDevExecutionIntelligenceRefinementFoundation {

const trusted =
optimization.trusted === true &&
optimization.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-refinement",

objective:
optimization.objective,

trusted,

refinementState:
trusted
?
[
"intelligence optimization record accepted",
"intelligence refinement created",
"controlled intelligence boundary preserved"
]
:
[
"intelligence refinement restricted",
"intelligence optimization review required"
],

provenance:
trusted
?
[
"intelligence optimization verified",
"refinement provenance preserved",
"human authorization boundary maintained"
]
:
[
"intelligence optimization state preserved",
"refinement boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"intelligence optimization not trusted"
]

};

}
