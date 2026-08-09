import type {
RiverDevExecutionReflectionFoundation,
RiverDevExecutionLearningIntegrationFoundation
} from "../types";

export function createExecutionLearningIntegration(
reflection:
RiverDevExecutionReflectionFoundation
):
RiverDevExecutionLearningIntegrationFoundation {

const trusted =
reflection.trusted === true &&
reflection.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-learning-integration",

objective:
reflection.objective,

trusted,

learningState:
trusted
?
[
"reflection record accepted",
"learning integration created",
"controlled learning boundary preserved"
]
:
[
"learning integration restricted",
"reflection review required"
],

provenance:
trusted
?
[
"reflection record verified",
"learning provenance preserved",
"human authorization boundary maintained"
]
:
[
"reflection state preserved",
"learning boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"reflection record not trusted"
]

};

}
