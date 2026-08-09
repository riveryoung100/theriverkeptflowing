import type {
RiverDevExecutionFeedbackFoundation,
RiverDevExecutionLearningFoundation
} from "../types";

export function createExecutionLearning(
feedback:
RiverDevExecutionFeedbackFoundation
):
RiverDevExecutionLearningFoundation {

const trusted =
feedback.trusted === true &&
feedback.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-learning",

objective:
feedback.objective,

trusted,

learningState:
trusted
?
[
"execution feedback accepted",
"learning record created",
"controlled improvement boundary preserved"
]
:
[
"learning generation restricted",
"feedback requires review"
],

provenance:
trusted
?
[
"execution feedback verified",
"learning provenance preserved",
"controlled learning boundary maintained"
]
:
[
"feedback state preserved",
"learning boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"execution feedback not trusted"
]

};

}
