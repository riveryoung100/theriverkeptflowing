import type {
RiverDevExecutionIntelligenceReasoningFoundation,
RiverDevExecutionIntelligenceDecisionFoundation
} from "../types";

export function createExecutionIntelligenceDecision(
reasoning:
RiverDevExecutionIntelligenceReasoningFoundation
):
RiverDevExecutionIntelligenceDecisionFoundation {

const approved =
reasoning.trusted === true;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-decision",

objective:
reasoning.objective,

approved,

decision:
approved
?
"execute"
:
"hold",

actions:
approved
?
[
"execute governed implementation"
]
:
[],

provenance:
approved
?
[
"reasoning trust verified",
"execution decision boundary maintained",
"decision provenance preserved"
]
:
[
"blocked reasoning state recorded",
"decision safely held"
],

blockedReasons:
approved
?
[]
:
[
"execution reasoning not trusted"
]

};

}
