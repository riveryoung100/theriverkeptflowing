import type {
RiverDevExecutionIntelligenceContinuationFoundation,
RiverDevExecutionIntelligencePersistenceFoundation
} from "../types";

export function createExecutionIntelligencePersistence(
continuation:
RiverDevExecutionIntelligenceContinuationFoundation
):
RiverDevExecutionIntelligencePersistenceFoundation {

const trusted =
continuation.continuing === true &&
continuation.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-persistence",

objective:
continuation.objective,

trusted,

persistenceState:
trusted
?
[
"intelligence continuation record accepted",
"intelligence persistence created",
"controlled intelligence boundary preserved"
]
:
[
"intelligence persistence restricted",
"intelligence continuation review required"
],

provenance:
trusted
?
[
"intelligence continuation verified",
"persistence provenance preserved",
"human authorization boundary maintained"
]
:
[
"intelligence continuation state preserved",
"persistence boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"intelligence continuation not trusted"
]

};

}
