import type {
RiverDevExecutionDeploymentFoundation,
RiverDevExecutionVerificationFoundation
} from "../types";

export function createExecutionVerification(
deployment:
RiverDevExecutionDeploymentFoundation
):
RiverDevExecutionVerificationFoundation {

const trusted =
deployment.trusted === true &&
deployment.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-verification",

objective:
deployment.objective,

trusted,

verificationState:
trusted
?
[
"deployment record accepted",
"execution validation completed",
"controlled verification boundary preserved"
]
:
[
"verification generation restricted",
"deployment review required"
],

provenance:
trusted
?
[
"deployment record verified",
"verification provenance preserved",
"human authorization boundary maintained"
]
:
[
"deployment state preserved",
"verification boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"deployment record not trusted"
]

};

}
