import type {
RiverDevExecutionIntelligenceResultFoundation,
RiverDevExecutionIntelligenceLearningFoundation
} from "../types";

export function createExecutionIntelligenceLearning(
result:
RiverDevExecutionIntelligenceResultFoundation
):
RiverDevExecutionIntelligenceLearningFoundation {

const trusted =
result.successful === true &&
result.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-learning",

objective:
result.objective,

trusted,

learningState:
trusted
?
[
"intelligence result accepted",
"intelligence learning created",
"controlled intelligence learning preserved"
]
:
[
"intelligence learning restricted",
"result review required"
],

provenance:
trusted
?
[
"intelligence result verified",
"learning provenance preserved",
"human authorization boundary maintained"
]
:
[
"intelligence result state preserved",
"learning boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"intelligence result not trusted"
]

};

}
