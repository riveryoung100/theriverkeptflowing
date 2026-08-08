import type {
RiverDevExecutionIntelligenceOutcomeFoundation,
RiverDevExecutionIntelligenceContinuationFoundation
} from "../types";

export function createExecutionIntelligenceContinuation(
outcome:
RiverDevExecutionIntelligenceOutcomeFoundation
):
RiverDevExecutionIntelligenceContinuationFoundation {

const continuing =
outcome.successful === true;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-continuation",

objective:
outcome.objective,

continuing,

continuation:
continuing
?
[
"successful execution outcome accepted",
"controlled continuation state prepared",
"next governed execution phase available"
]
:
[
"continuation halted",
"failed outcome recorded",
"review required before continuation"
],

provenance:
continuing
?
[
"outcome success verified",
"continuation boundary maintained",
"execution provenance preserved"
]
:
[
"failed outcome state recorded",
"continuation boundary maintained"
],

blockedReasons:
continuing
?
[]
:
[
"execution outcome not successful"
]

};

}
