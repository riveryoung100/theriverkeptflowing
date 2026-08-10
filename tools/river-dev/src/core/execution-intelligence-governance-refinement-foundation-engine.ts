import type {
RiverDevExecutionIntelligenceGovernanceOptimizationFoundation,
RiverDevExecutionIntelligenceGovernanceRefinementFoundation
} from "../types";

export function createExecutionIntelligenceGovernanceRefinement(
governanceOptimization:
RiverDevExecutionIntelligenceGovernanceOptimizationFoundation
):
RiverDevExecutionIntelligenceGovernanceRefinementFoundation {

const trusted =
governanceOptimization.trusted === true &&
governanceOptimization.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-governance-refinement",

objective:
governanceOptimization.objective,

trusted,

governanceRefinementState:
trusted
?
[
"governance optimization accepted",
"governance refinement created",
"controlled governance refinement preserved",
"repository authorization boundary preserved"
]
:
[
"governance refinement restricted",
"governance optimization review required"
],

provenance:
trusted
?
[
"governance optimization verified",
"governance refinement provenance preserved",
"human authorization boundary maintained",
"strict scope boundary maintained"
]
:
[
"governance optimization state preserved",
"governance refinement boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"governance optimization not trusted"
]

};

}
