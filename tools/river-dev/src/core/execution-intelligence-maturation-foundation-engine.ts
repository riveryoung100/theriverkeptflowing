import type {
RiverDevExecutionIntelligenceRefinementFoundation,
RiverDevExecutionIntelligenceMaturationFoundation
} from "../types";

export function createExecutionIntelligenceMaturation(
refinement:
RiverDevExecutionIntelligenceRefinementFoundation
):
RiverDevExecutionIntelligenceMaturationFoundation {

const trusted =
refinement.trusted === true &&
refinement.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-maturation",

objective:
refinement.objective,

trusted,

maturationState:
trusted
?
[
"intelligence refinement record accepted",
"intelligence maturation created",
"controlled intelligence boundary preserved"
]
:
[
"intelligence maturation restricted",
"intelligence refinement review required"
],

provenance:
trusted
?
[
"intelligence refinement verified",
"maturation provenance preserved",
"human authorization boundary maintained"
]
:
[
"intelligence refinement state preserved",
"maturation boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"intelligence refinement not trusted"
]

};

}
