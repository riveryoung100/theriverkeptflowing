import type {
RiverDevExecutionPreparation,
RiverDevExecutionIntelligenceFoundation
} from "../types";

export function createExecutionIntelligence(
preparation:
RiverDevExecutionPreparation
):
RiverDevExecutionIntelligenceFoundation {

const approved =
preparation.authorized === true;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence",

objective:
preparation.objective,

decision:
approved
?
"approved"
:
"blocked",

understood:
approved,

executionActions:
approved
?
[
"execute approved implementation"
]
:
[],

preparationSource:
"river-development-agent-execution-preparation",

blockedReasons:
approved
?
[]
:
[
"execution authorization missing"
]

};

}
