import type {
RiverDevExecutionActionFoundation,
RiverDevExecutionResultFoundation
} from "../types";

export function createExecutionResult(
action:
RiverDevExecutionActionFoundation
):
RiverDevExecutionResultFoundation {

const successful =
action.trusted === true &&
action.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-result",

objective:
action.objective,

completed:
successful,

successful,

resultState:
successful
?
[
"action record accepted",
"execution result completed",
"controlled result boundary preserved"
]
:
[
"result generation restricted",
"action review required"
],

provenance:
successful
?
[
"action record verified",
"result provenance preserved",
"human authorization boundary maintained"
]
:
[
"action state preserved",
"result boundary maintained"
],

blockedReasons:
successful
?
[]
:
[
"action record not trusted"
]

};

}
