import type {
RiverDevExecutionResultFoundation,
RiverDevExecutionFeedbackFoundation
} from "../types";

export function createExecutionFeedback(
result:
RiverDevExecutionResultFoundation
):
RiverDevExecutionFeedbackFoundation {

const trusted =
result.completed === true &&
result.successful === true &&
result.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-feedback",

objective:
result.objective,

trusted,

feedbackState:
trusted
?
[
"execution result accepted",
"successful outcome recorded",
"learning feedback signal created"
]
:
[
"execution result requires review",
"feedback generation restricted"
],

provenance:
trusted
?
[
"execution result verified",
"feedback provenance preserved",
"controlled learning boundary maintained"
]
:
[
"execution result preserved",
"feedback boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"execution result not trusted"
]

};

}
