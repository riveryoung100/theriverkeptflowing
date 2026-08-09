import type {
RiverDevExecutionEvolutionFoundation,
RiverDevExecutionGovernanceFoundation
} from "../types";

export function createExecutionGovernance(
evolution:
RiverDevExecutionEvolutionFoundation
):
RiverDevExecutionGovernanceFoundation {

const trusted =
evolution.trusted === true &&
evolution.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-governance",

objective:
evolution.objective,

trusted,

governanceState:
trusted
?
[
"evolution record accepted",
"authorization boundary verified",
"governed promotion state created"
]
:
[
"evolution governance restricted",
"authorization review required"
],

provenance:
trusted
?
[
"evolution record verified",
"governance provenance preserved",
"human oversight boundary maintained"
]
:
[
"evolution state preserved",
"governance boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"evolution record not trusted"
]

};

}
