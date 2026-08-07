import type {
RiverDevRunAuthorization,
RiverDevRunAuthorizationStep,
RiverDevExecutionReadiness
} from "../types";

export function createRunAuthorization(
readiness:
RiverDevExecutionReadiness
):
RiverDevRunAuthorization {

const authorization =
readiness.readiness.map(
(step):
RiverDevRunAuthorizationStep =>
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
authorization
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
readiness.objective,

authorized:
readiness.ready &&
authorization.every(
(item) =>
item.state === "authorized"
),

authorization,

blockedReasons

};

}
