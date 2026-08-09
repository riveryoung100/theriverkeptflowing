import type {
RiverDevExecutionKnowledgeIntegrationFoundation,
RiverDevExecutionIntelligenceFormationFoundation
} from "../types";

export function createExecutionIntelligenceFormation(
integration:
RiverDevExecutionKnowledgeIntegrationFoundation
):
RiverDevExecutionIntelligenceFormationFoundation {

const trusted =
integration.trusted === true &&
integration.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-formation",

objective:
integration.objective,

trusted,

intelligenceState:
trusted
?
[
"knowledge integration record accepted",
"intelligence formation created",
"controlled intelligence boundary preserved"
]
:
[
"intelligence formation restricted",
"knowledge integration review required"
],

provenance:
trusted
?
[
"knowledge integration verified",
"intelligence provenance preserved",
"human authorization boundary maintained"
]
:
[
"knowledge integration state preserved",
"intelligence boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"knowledge integration not trusted"
]

};

}
