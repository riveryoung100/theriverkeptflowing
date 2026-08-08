import type {
RiverDevExecutionIntelligenceActionFoundation,
RiverDevExecutionIntelligenceOutcomeFoundation
} from "../types";

export function createExecutionIntelligenceOutcome(
action:
RiverDevExecutionIntelligenceActionFoundation
):
RiverDevExecutionIntelligenceOutcomeFoundation {

const successful =
action.authorized === true;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-intelligence-outcome",

objective:
action.objective,

successful,

outcome:
successful
?
[
"authorized execution action completed",
"controlled execution outcome recorded",
"execution boundary preserved"
]
:
[
"execution action blocked",
"outcome generation halted safely",
"authorization review required"
],

provenance:
successful
?
[
"action authorization verified",
"outcome provenance preserved",
"controlled execution confirmed"
]
:
[
"blocked action state recorded",
"outcome boundary maintained"
],

blockedReasons:
successful
?
[]
:
[
"execution action not authorized"
]

};

}
