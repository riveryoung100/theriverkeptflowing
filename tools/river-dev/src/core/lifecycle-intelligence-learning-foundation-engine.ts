import type {
RiverDevExecutionLifecycleIntelligenceFeedback,
RiverDevExecutionLifecycleIntelligenceLearning
} from "../types";

export function createLifecycleIntelligenceLearning(
feedback:
RiverDevExecutionLifecycleIntelligenceFeedback
):
RiverDevExecutionLifecycleIntelligenceLearning {

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

learning:
feedback.feedback.map(
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
feedback.blockedReasons

};

}
