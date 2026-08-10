import type {
RiverDevExecutionIntelligencePolicyFoundation,
RiverDevExecutionIntelligenceComplianceFoundation
} from "../types";

export function createExecutionIntelligenceCompliance(
policy:
RiverDevExecutionIntelligencePolicyFoundation
):
RiverDevExecutionIntelligenceComplianceFoundation {

const trusted =
policy.trusted === true &&
policy.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-compliance",

objective:
policy.objective,

trusted,

complianceState:
trusted
?
[
"intelligence policy record accepted",
"intelligence compliance created",
"controlled intelligence compliance preserved"
]
:
[
"intelligence compliance restricted",
"intelligence policy review required"
],

provenance:
trusted
?
[
"intelligence policy verified",
"compliance provenance preserved",
"human authorization boundary maintained"
]
:
[
"intelligence policy state preserved",
"compliance boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"intelligence policy not trusted"
]

};

}
