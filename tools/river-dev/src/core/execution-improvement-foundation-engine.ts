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
"adaptation accepted",
"improvement proposal created",
"controlled system evolution boundary preserved"
]
:
[
"improvement generation restricted",
"adaptation requires review"
],

provenance:
trusted
?
[
"adaptation verified",
"improvement provenance preserved",
"controlled evolution boundary maintained"
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
"adaptation not trusted"
]

};

}
