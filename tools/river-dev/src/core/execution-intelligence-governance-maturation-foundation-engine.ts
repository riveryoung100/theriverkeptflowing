import type {
RiverDevExecutionIntelligenceGovernanceRefinementFoundation,
RiverDevExecutionIntelligenceGovernanceMaturationFoundation
} from "../types";

export function createExecutionIntelligenceGovernanceMaturation(
governanceRefinement:
RiverDevExecutionIntelligenceGovernanceRefinementFoundation
):
RiverDevExecutionIntelligenceGovernanceMaturationFoundation {

const trusted =
governanceRefinement.trusted === true &&
governanceRefinement.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-governance-maturation",

objective:
governanceRefinement.objective,

trusted,

governanceMaturationState:
trusted
?
[
"governance refinement accepted",
"governance maturation created",
"controlled governance maturation preserved",
"repository authorization boundary preserved"
]
:
[
"governance maturation restricted",
"governance refinement review required"
],

provenance:
trusted
?
[
"governance refinement verified",
"governance maturation provenance preserved",
"human authorization boundary maintained",
"strict scope boundary maintained"
]
:
[
"governance refinement state preserved",
"governance maturation boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"governance refinement not trusted"
]

};

}
