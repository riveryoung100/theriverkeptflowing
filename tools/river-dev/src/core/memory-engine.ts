import type {
RiverDevExecutionMemory,
RiverDevMemoryEntry,
RiverDevExecutionReasoning
} from "../types";

export function createExecutionMemory(
reasoning:
RiverDevExecutionReasoning
):
RiverDevExecutionMemory {

const entries =
reasoning.steps.map(
(step):
RiverDevMemoryEntry =>
({

category:
step.category,

key:
step.category,

value:
step.decision,

source:
"controlled-execution-reasoning"

})
);

const blockedReasons =
reasoning.steps
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
reasoning.objective,

trusted:
reasoning.validated &&
blockedReasons.length === 0,

entries,

blockedReasons

};

}
