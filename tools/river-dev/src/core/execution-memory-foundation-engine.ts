import type {
RiverDevExecutionContinuation,
RiverDevExecutionMemory
} from "../types";

export function createExecutionMemory(
continuation:
RiverDevExecutionContinuation
):
RiverDevExecutionMemory {

const trusted =
continuation.authorized === true &&
continuation.continuationState === "continue";

return {

version:
"1.0.0",

objective:
continuation.objective,

trusted,

entries:
trusted
?
[
{
category:
"execution",

key:
"continuation-state",

value:
"execution continuation accepted",

source:
"river-development-agent-execution-continuation"
},
{
category:
"memory",

key:
"execution-context",

value:
"controlled memory state created",

source:
"river-development-agent-execution-memory"
}
]
:
[
{
category:
"execution",

key:
"continuation-state",

value:
"execution continuation halted",

source:
"river-development-agent-execution-continuation"
}
],

blockedReasons:
trusted
?
[]
:
[
"execution continuation not authorized"
]

};

}
