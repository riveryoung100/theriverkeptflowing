import type {
RiverDevExecutionIntelligenceValidationFoundation,
RiverDevExecutionIntelligenceGovernanceFoundation
} from "../types";

export function createExecutionIntelligenceGovernance(
validation:
RiverDevExecutionIntelligenceValidationFoundation
):
RiverDevExecutionIntelligenceGovernanceFoundation {

const trusted =
validation.trusted === true &&
validation.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-governance",

objective:
validation.objective,

trusted,

governanceState:
trusted
?
[
"intelligence validation record accepted",
"intelligence governance created",
"controlled intelligence governance preserved"
]
:
[
"intelligence governance restricted",
"intelligence validation review required"
],

provenance:
trusted
?
[
"intelligence validation verified",
"governance provenance preserved",
"human authorization boundary maintained"
]
:
[
"intelligence validation state preserved",
"governance boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"intelligence validation not trusted"
]

};

}
