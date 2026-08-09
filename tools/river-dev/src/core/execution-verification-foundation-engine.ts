import type {
RiverDevExecutionAssuranceFoundation,
RiverDevExecutionVerificationFoundation
} from "../types";

export function createExecutionVerification(
assurance:
RiverDevExecutionAssuranceFoundation
):
RiverDevExecutionVerificationFoundation {

const trusted =
assurance.trusted === true &&
assurance.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-verification",

objective:
assurance.objective,

trusted,

verificationState:
trusted
?
[
"assurance record accepted",
"execution verification created",
"controlled verification boundary preserved"
]
:
[
"verification generation restricted",
"assurance review required"
],

provenance:
trusted
?
[
"assurance record verified",
"verification provenance preserved",
"human authorization boundary maintained"
]
:
[
"assurance state preserved",
"verification boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"assurance record not trusted"
]

};

}
