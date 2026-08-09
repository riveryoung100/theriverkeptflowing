import type {
RiverDevExecutionIntelligenceActivationFoundation,
RiverDevExecutionIntelligenceContinuationFoundation
} from "../types";

export function createExecutionIntelligenceContinuation(
activation:
RiverDevExecutionIntelligenceActivationFoundation
):
RiverDevExecutionIntelligenceContinuationFoundation {

const continuing =
activation.trusted === true &&
activation.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-continuation",

objective:
activation.objective,

continuing,

continuation:
continuing
?
[
"intelligence activation record accepted",
"intelligence continuation created",
"controlled intelligence boundary preserved"
]
:
[
"intelligence continuation restricted",
"intelligence activation review required"
],

provenance:
continuing
?
[
"intelligence activation verified",
"continuation provenance preserved",
"human authorization boundary maintained"
]
:
[
"intelligence activation state preserved",
"continuation boundary maintained"
],

blockedReasons:
continuing
?
[]
:
[
"intelligence activation not trusted"
]

};

}
