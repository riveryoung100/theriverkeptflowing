import type {
RiverDevExecutionIntelligenceDecisionFoundation,
RiverDevExecutionIntelligenceActionFoundation
} from "../types";

export function createExecutionIntelligenceAction(
decision:
RiverDevExecutionIntelligenceDecisionFoundation
):
RiverDevExecutionIntelligenceActionFoundation {

const authorized =
decision.approved === true &&
decision.decision === "execute";

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-action",

objective:
decision.objective,

authorized,

actions:
authorized
?
[
"trusted decision state accepted",
"controlled execution action prepared",
"human authorization boundary preserved"
]
:
[
"action generation blocked",
"decision state requires review",
"execution authorization not granted"
],

provenance:
authorized
?
[
"decision approval verified",
"action provenance preserved",
"execution boundary maintained"
]
:
[
"decision approval not verified",
"action boundary maintained"
],

blockedReasons:
authorized
?
[]
:
[
"execution decision not authorized"
]

};

}
