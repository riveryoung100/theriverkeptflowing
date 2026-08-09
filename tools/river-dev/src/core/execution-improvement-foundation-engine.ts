import type {
RiverDevExecutionAdaptationFoundation,
RiverDevExecutionImprovementFoundation
} from "../types";

export function createExecutionImprovement(
adaptation:
RiverDevExecutionAdaptationFoundation
):
RiverDevExecutionImprovementFoundation {

const trusted =
adaptation.trusted === true &&
adaptation.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-improvement",

objective:
adaptation.objective,

trusted,

improvementState:
trusted
?
[
"adaptation record accepted",
"execution improvement created",
"controlled improvement boundary preserved"
]
:
[
"improvement generation restricted",
"adaptation review required"
],

provenance:
trusted
?
[
"adaptation record verified",
"improvement provenance preserved",
"human authorization boundary maintained"
]
:
[
"adaptation state preserved",
"improvement boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"adaptation record not trusted"
]

};

}
