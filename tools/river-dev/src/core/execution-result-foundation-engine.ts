import type {
RiverDevExecutionRuntimeFoundation,
RiverDevExecutionResultFoundation
} from "../types";

export function createExecutionResult(
runtime:
RiverDevExecutionRuntimeFoundation
):
RiverDevExecutionResultFoundation {

const completed =
runtime.running === true &&
runtime.authorized === true &&
runtime.blockedReasons.length === 0;

const successful =
completed;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-result",

objective:
runtime.objective,

completed,

successful,

resultState:
successful
?
[
"runtime execution completed",
"execution result captured",
"controlled execution outcome preserved"
]
:
[
"execution result blocked",
"runtime outcome requires review"
],

provenance:
successful
?
[
"runtime authorization verified",
"execution result provenance preserved",
"result boundary maintained"
]
:
[
"runtime state preserved",
"execution result boundary maintained"
],

blockedReasons:
successful
?
[]
:
[
"execution runtime not completed"
]

};

}
