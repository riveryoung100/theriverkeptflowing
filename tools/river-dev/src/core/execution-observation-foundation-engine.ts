import type {
RiverDevExecutionVerificationFoundation,
RiverDevExecutionObservationFoundation
} from "../types";

export function createExecutionObservation(
verification:
RiverDevExecutionVerificationFoundation
):
RiverDevExecutionObservationFoundation {

const trusted =
verification.trusted === true &&
verification.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-observation",

objective:
verification.objective,

trusted,

observationState:
trusted
?
[
"verification record accepted",
"execution observation created",
"non-invasive monitoring boundary preserved"
]
:
[
"observation generation restricted",
"verification review required"
],

provenance:
trusted
?
[
"verification record verified",
"observation provenance preserved",
"human authorization boundary maintained"
]
:
[
"verification state preserved",
"observation boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"verification record not trusted"
]

};

}
