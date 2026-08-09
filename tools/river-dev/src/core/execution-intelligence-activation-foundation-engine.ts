import type {
RiverDevExecutionIntelligenceReadinessFoundation,
RiverDevExecutionIntelligenceActivationFoundation
} from "../types";

export function createExecutionIntelligenceActivation(
readiness:
RiverDevExecutionIntelligenceReadinessFoundation
):
RiverDevExecutionIntelligenceActivationFoundation {

const trusted =
readiness.trusted === true &&
readiness.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-activation",

objective:
readiness.objective,

trusted,

activationState:
trusted
?
[
"intelligence readiness record accepted",
"intelligence activation created",
"controlled intelligence boundary preserved"
]
:
[
"intelligence activation restricted",
"intelligence readiness review required"
],

provenance:
trusted
?
[
"intelligence readiness verified",
"activation provenance preserved",
"human authorization boundary maintained"
]
:
[
"intelligence readiness state preserved",
"activation boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"intelligence readiness not trusted"
]

};

}
