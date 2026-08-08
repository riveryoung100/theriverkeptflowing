import type {
RiverDevExecutionOutcome,
RiverDevExecutionReporting
} from "../types";

export function createExecutionReporting(
outcome:
RiverDevExecutionOutcome
):
RiverDevExecutionReporting {

const successful =
outcome.outcome === "successful" &&
outcome.authorized === true;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-reporting",

objective:
outcome.objective,

outcomeSource:
"river-development-agent-execution-outcome",

reportState:
successful
?
"successful"
:
"blocked",

reportEntries:
successful
?
[
"execution outcome validated",
"execution report generated",
"execution provenance preserved"
]
:
[
"execution outcome blocked",
"report generation halted",
"authorization review required"
],

validationSummary:
[
"verify execution outcome provenance",
"confirm authorization state",
"preserve deterministic reporting"
],

authorized:
outcome.authorized

};

}
