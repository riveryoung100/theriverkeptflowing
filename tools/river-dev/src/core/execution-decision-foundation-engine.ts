import type {
RiverDevExecutionPolicyFoundation,
RiverDevExecutionDecisionFoundation
} from "../types";

export function createExecutionDecision(
policy:
RiverDevExecutionPolicyFoundation
):
RiverDevExecutionDecisionFoundation {

const trusted =
policy.trusted === true &&
policy.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-decision",

objective:
policy.objective,

trusted,

decisionState:
trusted
?
[
"policy record accepted",
"execution decision created",
"controlled decision boundary preserved"
]
:
[
"decision generation restricted",
"policy review required"
],

provenance:
trusted
?
[
"policy record verified",
"decision provenance preserved",
"human authorization boundary maintained"
]
:
[
"policy state preserved",
"decision boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"policy record not trusted"
]

};

}
