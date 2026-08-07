import type {
RiverDevExecutionReasoning,
RiverDevReasoningStep,
RiverDevExecutionIntelligence
} from "../types";

export function createExecutionReasoning(
intelligence:
RiverDevExecutionIntelligence
):
RiverDevExecutionReasoning {

const steps =
intelligence.steps.map(
(step):
RiverDevReasoningStep =>
({

category:
step.category,

state:
step.state === "blocked"
? "blocked"
: step.state === "confirmation-required"
? "confirmation-required"
: "reasoned",

explanation:
step.explanation,

decision:
step.state === "understood"
? "Proceed with validated execution path."
: step.state === "confirmation-required"
? "Await human confirmation before proceeding."
: "Execution path blocked."

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
intelligence.objective,

validated:
intelligence.understood &&
steps.every(
(step) =>
step.state === "reasoned"
),

steps,

blockedReasons

};

}
