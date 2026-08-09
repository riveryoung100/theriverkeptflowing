import type {
RiverDevExecutionDecisionFoundation,
RiverDevExecutionAuthorizationFoundation
} from "../types";

export function createExecutionAuthorization(
decision:
RiverDevExecutionDecisionFoundation
):
RiverDevExecutionAuthorizationFoundation {

const trusted =
decision.trusted === true &&
decision.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-authorization",

objective:
decision.objective,

trusted,

authorizationState:
trusted
?
[
"decision record accepted",
"execution authorization created",
"controlled authorization boundary preserved"
]
:
[
"authorization generation restricted",
"decision review required"
],

provenance:
trusted
?
[
"decision record verified",
"authorization provenance preserved",
"human authorization boundary maintained"
]
:
[
"decision state preserved",
"authorization boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"decision record not trusted"
]

};

}
