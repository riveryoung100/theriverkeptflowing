import type {
RiverDevExecutionLifecycle,
RiverDevExecutionOutcome
} from "../types";

export function createExecutionOutcome(
lifecycle:
RiverDevExecutionLifecycle
):
RiverDevExecutionOutcome {

const authorized =
lifecycle.authorized === true &&
lifecycle.state !== "blocked";

const successful =
authorized &&
lifecycle.active === true;

return {

version:
"1.0.0",

source:
"river-development-agent-execution-outcome",

objective:
lifecycle.objective,

lifecycleSource:
"river-development-agent-execution-lifecycle",

outcome:
successful
?
"successful"
:
"blocked",

executionResult:
successful
?
[
"execution lifecycle completed",
"execution outcome recorded",
"validation state preserved"
]
:
[
"execution outcome blocked",
"lifecycle state preserved",
"authorization review required"
],

validationSummary:
[
"verify lifecycle provenance",
"confirm authorization boundary",
"preserve deterministic outcome"
],

authorized

};

}
