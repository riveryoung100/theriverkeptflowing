import type {
RiverDevExecutionKnowledgeFormationFoundation,
RiverDevExecutionKnowledgeConsolidationFoundation
} from "../types";

export function createExecutionKnowledgeConsolidation(
formation:
RiverDevExecutionKnowledgeFormationFoundation
):
RiverDevExecutionKnowledgeConsolidationFoundation {

const trusted =
formation.trusted === true &&
formation.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-knowledge-consolidation",

objective:
formation.objective,

trusted,

consolidationState:
trusted
?
[
"knowledge formation record accepted",
"knowledge consolidation created",
"controlled knowledge boundary preserved"
]
:
[
"knowledge consolidation restricted",
"knowledge formation review required"
],

provenance:
trusted
?
[
"knowledge formation verified",
"consolidation provenance preserved",
"human authorization boundary maintained"
]
:
[
"knowledge formation state preserved",
"consolidation boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"knowledge formation not trusted"
]

};

}
