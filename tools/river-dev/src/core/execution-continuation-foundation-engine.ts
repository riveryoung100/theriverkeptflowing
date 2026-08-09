import type {
RiverDevExecutionCompletionFoundation,
RiverDevExecutionContinuationFoundation
} from "../types";

export function createExecutionContinuation(
completion:
RiverDevExecutionCompletionFoundation
):
RiverDevExecutionContinuationFoundation {

const authorized =
completion.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-continuation",

objective:
completion.objective,

continuationState:
authorized
?
"completion accepted; continuation created; controlled continuation boundary preserved"
:
"continuation generation restricted; completion review required",

authorized,

continuationActions:
authorized
?
[
"continue governed execution flow",
"preserve execution provenance",
"maintain authorization boundary"
]
:
[
"halt continuation",
"require review"
],

reportingSource:
"river-development-agent-execution-continuation",

provenance:
authorized
?
[
"completion record verified",
"continuation provenance preserved",
"human authorization boundary maintained"
]
:
[
"completion state preserved",
"continuation boundary maintained"
],

blockedReasons:
authorized
?
[]
:
[
"completion record not authorized"
]

};

}
