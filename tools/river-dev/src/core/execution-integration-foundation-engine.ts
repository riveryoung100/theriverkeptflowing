import type {
RiverDevExecutionConsolidationFoundation,
RiverDevExecutionIntegrationFoundation
} from "../types";

export function createExecutionIntegration(
consolidation:
RiverDevExecutionConsolidationFoundation
):
RiverDevExecutionIntegrationFoundation {

const trusted =
consolidation.trusted === true &&
consolidation.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-integration",

objective:
consolidation.objective,

trusted,

integrationState:
trusted
?
[
"consolidation record accepted",
"execution integration created",
"controlled integration boundary preserved"
]
:
[
"integration generation restricted",
"consolidation review required"
],

provenance:
trusted
?
[
"consolidation record verified",
"integration provenance preserved",
"human authorization boundary maintained"
]
:
[
"consolidation state preserved",
"integration boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"consolidation record not trusted"
]

};

}

