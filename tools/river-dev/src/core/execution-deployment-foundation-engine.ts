import type {
RiverDevExecutionPromotionFoundation,
RiverDevExecutionDeploymentFoundation
} from "../types";

export function createExecutionDeployment(
promotion:
RiverDevExecutionPromotionFoundation
):
RiverDevExecutionDeploymentFoundation {

const trusted =
promotion.trusted === true &&
promotion.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-deployment",

objective:
promotion.objective,

trusted,

deploymentState:
trusted
?
[
"promotion record accepted",
"deployment readiness created",
"controlled deployment boundary preserved"
]
:
[
"deployment generation restricted",
"promotion review required"
],

provenance:
trusted
?
[
"promotion record verified",
"deployment provenance preserved",
"human authorization boundary maintained"
]
:
[
"promotion state preserved",
"deployment boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"promotion record not trusted"
]

};

}
