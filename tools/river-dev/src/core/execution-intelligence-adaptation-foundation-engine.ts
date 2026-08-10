import type {
RiverDevExecutionIntelligenceLearningFoundation,
RiverDevExecutionIntelligenceAdaptationFoundation
} from "../types";

export function createExecutionIntelligenceAdaptation(
learning:
RiverDevExecutionIntelligenceLearningFoundation
):
RiverDevExecutionIntelligenceAdaptationFoundation {

const trusted =
learning.trusted === true &&
learning.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-adaptation",

objective:
learning.objective,

trusted,

adaptationState:
trusted
?
[
"intelligence learning accepted",
"intelligence adaptation created",
"controlled intelligence adaptation preserved"
]
:
[
"intelligence adaptation restricted",
"learning review required"
],

provenance:
trusted
?
[
"intelligence learning verified",
"adaptation provenance preserved",
"human authorization boundary maintained"
]
:
[
"intelligence learning state preserved",
"adaptation boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"intelligence learning not trusted"
]

};

}
