import type {
RiverDevExecutionResultFoundation,
RiverDevExecutionLearningFoundation
} from "../types";

export function createExecutionLearning(
result:
RiverDevExecutionResultFoundation
):
RiverDevExecutionLearningFoundation {

const trusted =
result.successful === true &&
result.completed === true &&
result.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-learning",

objective:
result.objective,

trusted,

learningState:
trusted
?
[
"result record accepted",
"execution learning created",
"controlled learning boundary preserved"
]
:
[
"learning generation restricted",
"result review required"
],

provenance:
trusted
?
[
"result record verified",
"learning provenance preserved",
"human authorization boundary maintained"
]
:
[
"result state preserved",
"learning boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"result record not trusted"
]

};

}
