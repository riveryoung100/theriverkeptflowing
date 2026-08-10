import type {
RiverDevExecutionIntelligenceExecutionFoundation,
RiverDevExecutionIntelligenceResultFoundation
} from "../types";

export function createExecutionIntelligenceResult(
execution:
RiverDevExecutionIntelligenceExecutionFoundation
):
RiverDevExecutionIntelligenceResultFoundation {

const successful =
execution.executed === true &&
execution.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-result",

objective:
execution.objective,

successful,

resultState:
successful
?
[
"intelligence execution accepted",
"intelligence result created",
"controlled intelligence result preserved"
]
:
[
"intelligence result restricted",
"execution review required"
],

provenance:
successful
?
[
"intelligence execution verified",
"result provenance preserved",
"human authorization boundary maintained"
]
:
[
"intelligence execution state preserved",
"result boundary maintained"
],

blockedReasons:
successful
?
[]
:
[
"intelligence execution not successful"
]

};

}
