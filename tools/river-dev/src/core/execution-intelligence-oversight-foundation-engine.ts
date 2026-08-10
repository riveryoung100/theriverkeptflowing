import type {
RiverDevExecutionIntelligenceAuditFoundation,
RiverDevExecutionIntelligenceOversightFoundation
} from "../types";

export function createExecutionIntelligenceOversight(
audit:
RiverDevExecutionIntelligenceAuditFoundation
):
RiverDevExecutionIntelligenceOversightFoundation {

const trusted =
audit.trusted === true &&
audit.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-oversight",

objective:
audit.objective,

trusted,

oversightState:
trusted
?
[
"intelligence audit record accepted",
"intelligence oversight created",
"controlled intelligence oversight preserved"
]
:
[
"intelligence oversight restricted",
"intelligence audit review required"
],

provenance:
trusted
?
[
"intelligence audit verified",
"oversight provenance preserved",
"human authorization boundary maintained"
]
:
[
"intelligence audit state preserved",
"oversight boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"intelligence audit not trusted"
]

};

}
