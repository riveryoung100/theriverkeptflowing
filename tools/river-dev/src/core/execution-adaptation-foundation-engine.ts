import type {
RiverDevExecutionLearningFoundation,
RiverDevExecutionAdaptationFoundation
} from "../types";

export function createExecutionAdaptation(
learning:
RiverDevExecutionLearningFoundation
):
RiverDevExecutionAdaptationFoundation {

const trusted =
learning.trusted === true &&
learning.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-adaptation",

objective:
learning.objective,

trusted,

adaptationState:
trusted
?
[
"learning record accepted",
"improvement recommendation created",
"controlled adaptation boundary preserved"
]
:
[
"adaptation generation restricted",
"learning record requires review"
],

provenance:
trusted
?
[
"learning record verified",
"adaptation provenance preserved",
"controlled improvement boundary maintained"
]
:
[
"learning state preserved",
"adaptation boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"learning record not trusted"
]

};

}
