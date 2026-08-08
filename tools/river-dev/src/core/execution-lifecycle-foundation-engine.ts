import type {
RiverDevExecutionIntelligence,
RiverDevExecutionLifecycle
} from "../types";

export function createExecutionLifecycle(
intelligence:
RiverDevExecutionIntelligence
):
RiverDevExecutionLifecycle {

const authorized =
intelligence.decision === "approved";

return {

version:
"1.0.0",

source:
"river-development-agent-execution-lifecycle",

objective:
intelligence.objective,

executionSource:
"river-development-agent-execution-intelligence",

state:
authorized
?
"ready"
:
"blocked",

lifecycleSteps:
authorized
?
[
"validate execution decision",
"prepare lifecycle state",
"await controlled execution",
"record lifecycle result"
]
:
[
"halt lifecycle progression",
"preserve blocked state",
"request authorization review"
],

safetyChecks:
[
"verify execution decision",
"preserve execution provenance",
"maintain human authorization boundary"
],

active:
authorized,

lifecycle:
[
{
taskId:
"execution-lifecycle-foundation",

state:
authorized
?
"active"
:
"blocked",

reason:
authorized
?
"execution lifecycle ready"
:
"execution authorization blocked"
}
],

blockedReasons:
authorized
?
[]
:
[
"execution decision not approved"
],

authorized

};

}

