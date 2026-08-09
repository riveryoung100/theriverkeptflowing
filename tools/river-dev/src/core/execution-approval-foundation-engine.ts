import type {
RiverDevExecutionAuthorizationFoundation,
RiverDevExecutionApprovalFoundation
} from "../types";

export function createExecutionApproval(
authorization:
RiverDevExecutionAuthorizationFoundation
):
RiverDevExecutionApprovalFoundation {

const trusted =
authorization.trusted === true &&
authorization.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-approval",

objective:
authorization.objective,

trusted,

approvalState:
trusted
?
[
"authorization record accepted",
"execution approval created",
"controlled approval boundary preserved"
]
:
[
"approval generation restricted",
"authorization review required"
],

provenance:
trusted
?
[
"authorization record verified",
"approval provenance preserved",
"human authorization boundary maintained"
]
:
[
"authorization state preserved",
"approval boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"authorization record not trusted"
]

};

}
