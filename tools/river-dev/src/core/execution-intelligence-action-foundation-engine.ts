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
decision.approved === true
&& decision.decision === "execute";

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
"execute approved governed action"
]
:
[],

provenance:
authorized
?
[
"decision authorization verified",
"execution action boundary maintained",
"action provenance preserved"
]
:
[
"blocked decision state recorded",
"action generation halted safely"
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
