import type {
RiverDevExecutionStabilizationFoundation,
RiverDevExecutionAssuranceFoundation
} from "../types";

export function createExecutionAssurance(
stabilization:
RiverDevExecutionStabilizationFoundation
):
RiverDevExecutionAssuranceFoundation {

const trusted =
stabilization.trusted === true &&
stabilization.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-assurance",

objective:
stabilization.objective,

trusted,

assuranceState:
trusted
?
[
"stabilization record accepted",
"execution assurance created",
"controlled assurance boundary preserved"
]
:
[
"assurance generation restricted",
"stabilization review required"
],

provenance:
trusted
?
[
"stabilization record verified",
"assurance provenance preserved",
"human authorization boundary maintained"
]
:
[
"stabilization state preserved",
"assurance boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"stabilization record not trusted"
],

evolutionState:
trusted
?
[
"controlled evolution maintained",
"assurance progression recorded"
]
:
[
"evolution boundary preserved"
]

};

}

