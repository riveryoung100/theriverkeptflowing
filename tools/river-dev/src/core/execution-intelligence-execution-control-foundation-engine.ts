import type {
RiverDevExecutionIntelligenceOrchestrationFoundation,
RiverDevExecutionIntelligenceExecutionControlFoundation
} from "../types";


export function createExecutionIntelligenceExecutionControl(
orchestration:
RiverDevExecutionIntelligenceOrchestrationFoundation
):
RiverDevExecutionIntelligenceExecutionControlFoundation {


const controlled =
orchestration.orchestrated === true &&
orchestration.authorized === true &&
orchestration.blockedReasons.length === 0;


return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-execution-control",

objective:
orchestration.objective,

controlled,

authorized:
orchestration.authorized,

executionRequest:
controlled
?
[
"execution request created",
"repository change requires approval",
"controlled execution boundary preserved"
]
:
[
"execution request blocked",
"authorization review required"
],

provenance:
controlled
?
[
"orchestration authorization verified",
"execution provenance preserved",
"control boundary maintained"
]
:
[
"untrusted orchestration state recorded",
"execution boundary maintained"
],

blockedReasons:
controlled
?
[]
:
[
"orchestration state not authorized"
]

};

}
