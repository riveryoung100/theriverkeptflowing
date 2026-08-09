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
"execution adaptation created",
"controlled adaptation boundary preserved"
]
:
[
"adaptation generation restricted",
"learning review required"
],

provenance:
trusted
?
[
"learning record verified",
"adaptation provenance preserved",
"human authorization boundary maintained"
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
