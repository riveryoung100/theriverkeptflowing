import type {
RiverDevExecutionLifecycleIntelligenceOutcome,
RiverDevExecutionLifecycleIntelligenceFeedback
} from "../types";

export function createLifecycleIntelligenceFeedback(
outcome:
RiverDevExecutionLifecycleIntelligenceOutcome
):
RiverDevExecutionLifecycleIntelligenceFeedback {

const blocked =
outcome.trusted === false ||
outcome.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
outcome.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-outcome",

feedback:
outcome.outcome.map(
(step) =>
({
taskId:
step.taskId,

state:
blocked
? "blocked"
: "learned",

reason:
step.reason

})
),

blockedReasons:
outcome.blockedReasons

};

}
