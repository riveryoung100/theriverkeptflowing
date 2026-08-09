import type {
RiverDevExecutionLearningIntegrationFoundation,
RiverDevExecutionKnowledgeFormationFoundation
} from "../types";

export function createExecutionKnowledgeFormation(
integration:
RiverDevExecutionLearningIntegrationFoundation
):
RiverDevExecutionKnowledgeFormationFoundation {

const trusted =
integration.trusted === true &&
integration.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-knowledge-formation",

objective:
integration.objective,

trusted,

knowledgeState:
trusted
?
[
"learning integration accepted",
"knowledge formation created",
"controlled knowledge boundary preserved"
]
:
[
"knowledge formation restricted",
"learning integration review required"
],

provenance:
trusted
?
[
"learning integration verified",
"knowledge provenance preserved",
"human authorization boundary maintained"
]
:
[
"learning integration state preserved",
"knowledge boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"learning integration not trusted"
]

};

}
