import type {
RiverDevExecutionVerificationFoundation,
RiverDevExecutionAssuranceFoundation
} from "../types";

export function createExecutionAssurance(
verification:
RiverDevExecutionVerificationFoundation
):
RiverDevExecutionAssuranceFoundation {

const trusted =
verification.trusted === true &&
verification.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-assurance",

objective:
verification.objective,

trusted,

assuranceState:
trusted
?
[
"verification record accepted",
"execution assurance created",
"controlled assurance boundary preserved"
]
:
[
"assurance generation restricted",
"verification review required"
],

provenance:
trusted
?
[
"verification record verified",
"assurance provenance preserved",
"human authorization boundary maintained"
]
:
[
"verification state preserved",
"assurance boundary maintained"
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

