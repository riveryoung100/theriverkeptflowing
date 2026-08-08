import type {
RiverDevExecutionLifecycleIntelligenceAdaptation,
RiverDevExecutionLifecycleIntelligenceFeedback
} from "../types";

export function createLifecycleIntelligenceAdaptation(
feedback:
RiverDevExecutionLifecycleIntelligenceFeedback
):
RiverDevExecutionLifecycleIntelligenceAdaptation {

const blocked =
feedback.trusted === false ||
feedback.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
feedback.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-feedback",

adaptation:
feedback.feedback.map(
(step) =>
({

taskId:
step.taskId,

state:
blocked
? "blocked"
: "adapted",

reason:
step.reason

})
),

blockedReasons:
feedback.blockedReasons

};

}
