import type {
RiverDevExecutionImprovementFoundation,
RiverDevExecutionEvolutionFoundation
} from "../types";

export function createExecutionEvolution(
improvement:
RiverDevExecutionImprovementFoundation
):
RiverDevExecutionEvolutionFoundation {

const trusted =
improvement.trusted === true &&
improvement.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-evolution",

objective:
improvement.objective,

trusted,

evolutionState:
trusted
?
[
"improvement proposal accepted",
"evolution record created",
"controlled system evolution boundary preserved"
]
:
[
"evolution generation restricted",
"improvement requires review"
],

provenance:
trusted
?
[
"improvement proposal verified",
"evolution provenance preserved",
"controlled evolution boundary maintained"
]
:
[
"improvement state preserved",
"evolution boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"improvement proposal not trusted"
]

};

}
