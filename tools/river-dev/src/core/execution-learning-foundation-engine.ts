import type {
RiverDevExecutionObservationFoundation,
RiverDevExecutionLearningFoundation
} from "../types";

export function createExecutionLearning(
observation:
RiverDevExecutionObservationFoundation
):
RiverDevExecutionLearningFoundation {

const trusted =
observation.trusted === true &&
observation.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-learning",

objective:
observation.objective,

trusted,

learningState:
trusted
?
[
"observation record accepted",
"execution learning record created",
"controlled knowledge evolution boundary preserved"
]
:
[
"learning generation restricted",
"observation review required"
],

provenance:
trusted
?
[
"observation record verified",
"learning provenance preserved",
"human authorization boundary maintained"
]
:
[
"observation state preserved",
"learning boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"observation record not trusted"
]

};

}
