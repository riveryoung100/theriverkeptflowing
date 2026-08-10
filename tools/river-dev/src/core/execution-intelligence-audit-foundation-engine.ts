import type {
RiverDevExecutionIntelligenceComplianceFoundation,
RiverDevExecutionIntelligenceAuditFoundation
} from "../types";

export function createExecutionIntelligenceAudit(
compliance:
RiverDevExecutionIntelligenceComplianceFoundation
):
RiverDevExecutionIntelligenceAuditFoundation {

const trusted =
compliance.trusted === true &&
compliance.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-audit",

objective:
compliance.objective,

trusted,

auditState:
trusted
?
[
"intelligence compliance record accepted",
"intelligence audit created",
"controlled intelligence audit preserved"
]
:
[
"intelligence audit restricted",
"intelligence compliance review required"
],

provenance:
trusted
?
[
"intelligence compliance verified",
"audit provenance preserved",
"human authorization boundary maintained"
]
:
[
"intelligence compliance state preserved",
"audit boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"intelligence compliance not trusted"
]

};

}
