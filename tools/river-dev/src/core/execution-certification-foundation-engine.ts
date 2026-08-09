import type {
RiverDevExecutionVerificationFoundation,
RiverDevExecutionCertificationFoundation
} from "../types";

export function createExecutionCertification(
verification:
RiverDevExecutionVerificationFoundation
):
RiverDevExecutionCertificationFoundation {

const trusted =
verification.trusted === true &&
verification.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-certification",

objective:
verification.objective,

trusted,

certificationState:
trusted
?
[
"verification record accepted",
"execution certification created",
"controlled certification boundary preserved"
]
:
[
"certification generation restricted",
"verification review required"
],

provenance:
trusted
?
[
"verification record verified",
"certification provenance preserved",
"human authorization boundary maintained"
]
:
[
"verification state preserved",
"certification boundary maintained"
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
