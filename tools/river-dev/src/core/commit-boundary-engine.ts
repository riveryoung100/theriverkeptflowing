import type {
RiverDevCommitBoundary,
RiverDevCommitBoundaryStep,
RiverDevExecutionFinalGate
} from "../types";

export function createCommitBoundary(
finalGate:
RiverDevExecutionFinalGate
):
RiverDevCommitBoundary {

const commits =
finalGate.gates.map(
(step):
RiverDevCommitBoundaryStep =>
({

taskId:
step.taskId,

state:
step.state === "blocked"
? "blocked"
: step.state === "confirmation-required"
? "confirmation-required"
: "authorized",

reason:
step.reason

})
);

const blockedReasons =
commits
.filter(
(item) =>
item.state === "blocked"
)
.map(
(item) =>
item.reason
);

return {

version:
"1.0.0",

objective:
finalGate.objective,

permitted:
finalGate.permitted &&
commits.every(
(item) =>
item.state === "authorized"
),

commits,

blockedReasons

};

}
