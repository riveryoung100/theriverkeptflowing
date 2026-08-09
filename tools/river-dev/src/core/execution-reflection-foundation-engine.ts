import type {
RiverDevExecutionContinuationFoundation,
RiverDevExecutionReflectionFoundation
} from "../types";

export function createExecutionReflection(
continuation:
RiverDevExecutionContinuationFoundation
):
RiverDevExecutionReflectionFoundation {

const trusted =
continuation.authorized === true &&
continuation.blockedReasons.length === 0;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-reflection",

objective:
continuation.objective,

trusted,

reflectionState:
trusted
?
[
"continuation record accepted",
"execution reflection created",
"controlled reflection boundary preserved"
]
:
[
"reflection generation restricted",
"continuation review required"
],

provenance:
trusted
?
[
"continuation record verified",
"reflection provenance preserved",
"human authorization boundary maintained"
]
:
[
"continuation state preserved",
"reflection boundary maintained"
],

blockedReasons:
trusted
?
[]
:
[
"continuation record not authorized"
]

};

}
