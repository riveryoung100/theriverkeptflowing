import type {
RiverDevExecutionKnowledgeConsolidationFoundation,
RiverDevExecutionKnowledgeIntegrationFoundation
} from "../types";

export function createExecutionKnowledgeIntegration(
consolidation:
RiverDevExecutionKnowledgeConsolidationFoundation
):
RiverDevExecutionKnowledgeIntegrationFoundation {

const trusted =
consolidation.trusted === true &&
consolidation.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-knowledge-integration",

objective:
consolidation.objective,

trusted,

integrationState:
trusted
?
[
"knowledge consolidation record accepted",
"knowledge integration created",
"controlled knowledge boundary preserved"
]
:
[
"knowledge integration restricted",
"knowledge consolidation review required"
],

provenance:
trusted
?
[
"knowledge consolidation verified",
"integration provenance preserved",
"human authorization boundary maintained"
]
:
[
"knowledge consolidation state preserved",
"integration boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"knowledge consolidation not trusted"
]

};

}
