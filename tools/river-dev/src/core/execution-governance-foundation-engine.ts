import type {
RiverDevExecutionAssuranceFoundation,
RiverDevExecutionGovernanceFoundation
} from "../types";

export function createExecutionGovernance(
assurance:
RiverDevExecutionAssuranceFoundation
):
RiverDevExecutionGovernanceFoundation {

const trusted =
assurance.trusted === true &&
assurance.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-governance",

objective:
assurance.objective,

trusted,

governanceState:
trusted
?
[
"assurance record accepted",
"execution governance created",
"controlled governance boundary preserved"
]
:
[
"governance generation restricted",
"assurance review required"
],

provenance:
trusted
?
[
"assurance record verified",
"governance provenance preserved",
"human authorization boundary maintained"
]
:
[
"assurance state preserved",
"governance boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"assurance record not trusted"
]

};

}

