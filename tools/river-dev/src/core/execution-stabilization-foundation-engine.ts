import type {
RiverDevExecutionIntegrationFoundation,
RiverDevExecutionStabilizationFoundation
} from "../types";

export function createExecutionStabilization(
integration:
RiverDevExecutionIntegrationFoundation
):
RiverDevExecutionStabilizationFoundation {

const trusted =
integration.trusted === true &&
integration.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-stabilization",

objective:
integration.objective,

trusted,

stabilizationState:
trusted
?
[
"integration record accepted",
"execution stabilization created",
"controlled stabilization boundary preserved"
]
:
[
"stabilization generation restricted",
"integration review required"
],

provenance:
trusted
?
[
"integration record verified",
"stabilization provenance preserved",
"human authorization boundary maintained"
]
:
[
"integration state preserved",
"stabilization boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"integration record not trusted"
]

};

}
