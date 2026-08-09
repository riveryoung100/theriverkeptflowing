import type {
RiverDevExecutionIntelligencePreservationFoundation,
RiverDevExecutionIntelligenceConsolidationFoundation
} from "../types";

export function createExecutionIntelligenceConsolidation(
preservation:
RiverDevExecutionIntelligencePreservationFoundation
):
RiverDevExecutionIntelligenceConsolidationFoundation {

const trusted =
preservation.trusted === true &&
preservation.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-consolidation",

objective:
preservation.objective,

trusted,

consolidationState:
trusted
?
[
"intelligence preservation record accepted",
"intelligence consolidation created",
"controlled intelligence boundary preserved"
]
:
[
"intelligence consolidation restricted",
"intelligence preservation review required"
],

provenance:
trusted
?
[
"intelligence preservation verified",
"consolidation provenance preserved",
"human authorization boundary maintained"
]
:
[
"intelligence preservation state preserved",
"consolidation boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"intelligence preservation not trusted"
]

};

}
