import type {
RiverDevExecutionIntelligencePersistenceFoundation,
RiverDevExecutionIntelligencePreservationFoundation
} from "../types";

export function createExecutionIntelligencePreservation(
persistence:
RiverDevExecutionIntelligencePersistenceFoundation
):
RiverDevExecutionIntelligencePreservationFoundation {

const trusted =
persistence.trusted === true &&
persistence.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-preservation",

objective:
persistence.objective,

trusted,

preservationState:
trusted
?
[
"intelligence persistence record accepted",
"intelligence preservation created",
"controlled intelligence boundary preserved"
]
:
[
"intelligence preservation restricted",
"intelligence persistence review required"
],

provenance:
trusted
?
[
"intelligence persistence verified",
"preservation provenance preserved",
"human authorization boundary maintained"
]
:
[
"intelligence persistence state preserved",
"preservation boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"intelligence persistence not trusted"
]

};

}
