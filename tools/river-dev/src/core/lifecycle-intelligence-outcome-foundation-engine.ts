import type {
RiverDevExecutionLifecycleIntelligenceAction,
RiverDevExecutionLifecycleIntelligenceOutcome
} from "../types";

export function createLifecycleIntelligenceOutcome(
action:
RiverDevExecutionLifecycleIntelligenceAction
):
RiverDevExecutionLifecycleIntelligenceOutcome {

const blocked =
action.trusted === false ||
action.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
action.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-action",

outcome:
action.action.map(
(step) =>
({
taskId:
step.taskId,

state:
blocked
? "blocked"
: "completed",

reason:
step.reason

})
),

blockedReasons:
action.blockedReasons

};

}
