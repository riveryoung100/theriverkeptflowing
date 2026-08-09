import type {
RiverDevExecutionIntelligenceFormationFoundation,
RiverDevExecutionIntelligenceConsolidationFoundation
} from "../types";

export function createExecutionIntelligenceConsolidation(
formation:
RiverDevExecutionIntelligenceFormationFoundation
):
RiverDevExecutionIntelligenceConsolidationFoundation {

const trusted =
formation.trusted === true &&
formation.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-consolidation",

objective:
formation.objective,

trusted,

consolidationState:
trusted
?
[
"intelligence formation record accepted",
"intelligence consolidation created",
"controlled intelligence boundary preserved"
]
:
[
"intelligence consolidation restricted",
"intelligence formation review required"
],

provenance:
trusted
?
[
"intelligence formation verified",
"consolidation provenance preserved",
"human authorization boundary maintained"
]
:
[
"intelligence formation state preserved",
"consolidation boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"intelligence formation not trusted"
]

};

}
