import type {
RiverDevExecutionRestorationFoundation,
RiverDevExecutionVerificationFoundation
} from "../types";

export function createExecutionVerification(
restoration:
RiverDevExecutionRestorationFoundation
):
RiverDevExecutionVerificationFoundation {

const trusted =
restoration.trusted === true &&
restoration.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-verification",

objective:
restoration.objective,

trusted,

verificationState:
trusted
?
[
"restoration record accepted",
"execution verification created",
"controlled verification boundary preserved"
]
:
[
"verification generation restricted",
"restoration review required"
],

provenance:
trusted
?
[
"restoration record verified",
"verification provenance preserved",
"human authorization boundary maintained"
]
:
[
"restoration state preserved",
"verification boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"restoration record not trusted"
]

};

}
