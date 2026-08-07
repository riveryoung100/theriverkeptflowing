import type {
RiverDevExecutionIntelligence,
RiverDevIntelligenceStep,
RiverDevExecutionOrchestrator
} from "../types";

export function createExecutionIntelligence(
orchestrator:
RiverDevExecutionOrchestrator
):
RiverDevExecutionIntelligence {

const steps =
orchestrator.steps.map(
(step):
RiverDevIntelligenceStep =>
({

category:
step.name,

state:
step.state === "blocked"
? "blocked"
: step.state === "confirmation-required"
? "confirmation-required"
: "understood",

explanation:
step.reason

})
);

const blockedReasons =
steps
.filter(
(step) =>
step.state === "blocked"
)
.map(
(step) =>
step.explanation
);

return {

version:
"1.0.0",

objective:
orchestrator.objective,

understood:
orchestrator.executable &&
steps.every(
(step) =>
step.state === "understood"
),

steps,

blockedReasons

};

}
