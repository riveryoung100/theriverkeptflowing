import type {
RiverDevExecutionImprovementFoundation,
RiverDevExecutionConsolidationFoundation
} from "../types";

export function createExecutionConsolidation(
improvement:
RiverDevExecutionImprovementFoundation
):
RiverDevExecutionConsolidationFoundation {

const trusted =
improvement.trusted === true &&
improvement.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-consolidation",

objective:
improvement.objective,

trusted,

consolidationState:
trusted
?
[
"improvement record accepted",
"execution consolidation created",
"controlled consolidation boundary preserved"
]
:
[
"consolidation generation restricted",
"improvement review required"
],

provenance:
trusted
?
[
"improvement record verified",
"consolidation provenance preserved",
"human authorization boundary maintained"
]
:
[
"improvement state preserved",
"consolidation boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"improvement record not trusted"
]

};

}
