import type {
RiverDevExecutionAudit,
RiverDevExecutionResult,
RiverDevAuditStep
} from "../types";

export function createExecutionAudit(
result:
RiverDevExecutionResult
):
RiverDevExecutionAudit {

const history =
result.results.map(
(step):
RiverDevAuditStep =>
({

taskId:
step.taskId,

state:
step.state,

reason:
step.reason

})
);

const blockedReasons =
history
.filter(
(entry) =>
entry.state === "blocked"
)
.map(
(entry) =>
entry.reason
);

return {

version:
"1.0.0",

objective:
result.objective,

complete:
result.ready &&
history.every(
(entry) =>
entry.state === "successful"
),

history,

blockedReasons

};

}
