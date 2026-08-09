import type {
RiverDevExecutionApprovalFoundation,
RiverDevExecutionEnforcementFoundation
} from "../types";

export function createExecutionEnforcement(
approval:
RiverDevExecutionApprovalFoundation
):
RiverDevExecutionEnforcementFoundation {

const trusted =
approval.trusted === true &&
approval.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-enforcement",

objective:
approval.objective,

trusted,

enforcementState:
trusted
?
[
"approval record accepted",
"execution enforcement created",
"controlled enforcement boundary preserved"
]
:
[
"enforcement generation restricted",
"approval review required"
],

provenance:
trusted
?
[
"approval record verified",
"enforcement provenance preserved",
"human authorization boundary maintained"
]
:
[
"approval state preserved",
"enforcement boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"approval record not trusted"
]

};

}
