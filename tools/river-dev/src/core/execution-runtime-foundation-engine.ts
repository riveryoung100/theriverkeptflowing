import type {
RiverDevExecutionIntelligenceExecutionControlFoundation,
RiverDevExecutionRuntimeFoundation
} from "../types";

export function createExecutionRuntime(
control:
RiverDevExecutionIntelligenceExecutionControlFoundation
):
RiverDevExecutionRuntimeFoundation {

const running =
control.controlled === true &&
control.authorized === true &&
control.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-runtime",

objective:
control.objective,

running,

authorized:
control.authorized,

runtimeState:
running
?
[
"execution control accepted",
"runtime state initialized",
"controlled execution boundary preserved"
]
:
[
"runtime initialization blocked",
"authorization review required"
],

provenance:
running
?
[
"execution control verified",
"runtime provenance preserved",
"execution boundary maintained"
]
:
[
"untrusted execution control recorded",
"runtime boundary maintained"
],

blockedReasons:
running
?
[]
:
[
"execution control not authorized"
]

};

}
