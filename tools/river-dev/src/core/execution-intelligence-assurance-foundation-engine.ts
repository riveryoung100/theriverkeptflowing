import type {
RiverDevExecutionIntelligenceStabilizationFoundation,
RiverDevExecutionIntelligenceAssuranceFoundation
} from "../types";

export function createExecutionIntelligenceAssurance(
stabilization:
RiverDevExecutionIntelligenceStabilizationFoundation
):
RiverDevExecutionIntelligenceAssuranceFoundation {

const trusted =
stabilization.trusted === true &&
stabilization.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-assurance",

objective:
stabilization.objective,

trusted,

assuranceState:
trusted
?
[
"intelligence stabilization record accepted",
"intelligence assurance created",
"controlled intelligence boundary preserved"
]
:
[
"intelligence assurance restricted",
"intelligence stabilization review required"
],

provenance:
trusted
?
[
"intelligence stabilization verified",
"assurance provenance preserved",
"human authorization boundary maintained"
]
:
[
"intelligence stabilization state preserved",
"assurance boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"intelligence stabilization not trusted"
]

};

}
