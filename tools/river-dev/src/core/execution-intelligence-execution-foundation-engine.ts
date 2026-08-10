import type {
RiverDevExecutionIntelligenceActionFoundation,
RiverDevExecutionIntelligenceExecutionFoundation
} from "../types";

export function createExecutionIntelligenceExecution(
action:
RiverDevExecutionIntelligenceActionFoundation
):
RiverDevExecutionIntelligenceExecutionFoundation {

const executed =
action.authorized === true &&
action.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-execution",

objective:
action.objective,

executed,

executionState:
executed
?
[
"intelligence action accepted",
"controlled intelligence execution completed",
"human authorization boundary preserved"
]
:
[
"intelligence execution withheld",
"authorization review required"
],

provenance:
executed
?
[
"intelligence action verified",
"execution provenance preserved",
"authorization boundary maintained"
]
:
[
"intelligence action state preserved",
"execution boundary maintained"
],

blockedReasons:
executed
?
[]
:
[
"intelligence action not authorized"
]

};

}
