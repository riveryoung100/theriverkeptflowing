import type {
RiverDevExecutionGovernanceFoundation,
RiverDevExecutionPolicyFoundation
} from "../types";

export function createExecutionPolicy(
governance:
RiverDevExecutionGovernanceFoundation
):
RiverDevExecutionPolicyFoundation {

const trusted =
governance.trusted === true &&
governance.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-policy",

objective:
governance.objective,

trusted,

policyState:
trusted
?
[
"governance record accepted",
"execution policy created",
"controlled policy boundary preserved"
]
:
[
"policy generation restricted",
"governance review required"
],

provenance:
trusted
?
[
"governance record verified",
"policy provenance preserved",
"human authorization boundary maintained"
]
:
[
"governance state preserved",
"policy boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"governance record not trusted"
]

};

}

