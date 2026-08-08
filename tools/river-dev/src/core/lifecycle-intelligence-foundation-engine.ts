import type {
RiverDevExecutionLifecycle,
RiverDevExecutionLifecycleIntelligence
} from "../types";

export function createLifecycleIntelligence(
lifecycle:
RiverDevExecutionLifecycle
):
RiverDevExecutionLifecycleIntelligence {

const blocked =
lifecycle.active === false ||
lifecycle.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
lifecycle.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle",

intelligence:
lifecycle.lifecycle.map(
(step) =>
({
taskId:
step.taskId,

state:
blocked
? "blocked"
: "trusted",

reason:
step.reason
})
),

blockedReasons:
lifecycle.blockedReasons

};

}
