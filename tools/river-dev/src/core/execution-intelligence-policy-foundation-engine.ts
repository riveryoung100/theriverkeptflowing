import type {
RiverDevExecutionIntelligenceGovernanceFoundation,
RiverDevExecutionIntelligencePolicyFoundation
} from "../types";

export function createExecutionIntelligencePolicy(
governance:
RiverDevExecutionIntelligenceGovernanceFoundation
):
RiverDevExecutionIntelligencePolicyFoundation {

const trusted =
governance.trusted === true &&
governance.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-policy",

objective:
governance.objective,

trusted,

policyState:
trusted
?
[
"intelligence governance record accepted",
"intelligence policy created",
"controlled intelligence policy preserved"
]
:
[
"intelligence policy restricted",
"intelligence governance review required"
],

provenance:
trusted
?
[
"intelligence governance verified",
"policy provenance preserved",
"human authorization boundary maintained"
]
:
[
"intelligence governance state preserved",
"policy boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"intelligence governance not trusted"
]

};

}
