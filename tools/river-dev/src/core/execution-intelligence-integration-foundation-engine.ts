import type {
RiverDevExecutionIntelligenceConsolidationFoundation,
RiverDevExecutionIntelligenceIntegrationFoundation
} from "../types";

export function createExecutionIntelligenceIntegration(
consolidation:
RiverDevExecutionIntelligenceConsolidationFoundation
):
RiverDevExecutionIntelligenceIntegrationFoundation {

const trusted =
consolidation.trusted === true &&
consolidation.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-integration",

objective:
consolidation.objective,

trusted,

integrationState:
trusted
?
[
"intelligence consolidation record accepted",
"intelligence integration created",
"controlled intelligence boundary preserved"
]
:
[
"intelligence integration restricted",
"intelligence consolidation review required"
],

provenance:
trusted
?
[
"intelligence consolidation verified",
"integration provenance preserved",
"human authorization boundary maintained"
]
:
[
"intelligence consolidation state preserved",
"integration boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"intelligence consolidation not trusted"
]

};

}
