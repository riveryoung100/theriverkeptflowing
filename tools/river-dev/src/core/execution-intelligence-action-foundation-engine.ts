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
decision.decision === "execute" &&
decision.blockedReasons.length === 0;

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
"controlled execution action authorized",
"execution boundary preserved",
"human authorization maintained"
]
:
[
"execution action withheld",
"human review required"
],

provenance:
authorized
?
[
"intelligence decision verified",
"action provenance preserved",
"authorization boundary maintained"
]
:
[
"intelligence decision state preserved",
"action boundary maintained"
],

blockedReasons:
authorized
?
[]
:
[
"intelligence decision not authorized"
]

};

}
