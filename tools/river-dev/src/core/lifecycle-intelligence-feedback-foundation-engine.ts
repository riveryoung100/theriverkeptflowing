import type {
RiverDevExecutionLifecycleIntelligenceFeedback,
RiverDevExecutionLifecycleIntelligenceExecution
} from "../types";

export function createLifecycleIntelligenceFeedback(
execution:
RiverDevExecutionLifecycleIntelligenceExecution
):
RiverDevExecutionLifecycleIntelligenceFeedback {

const blocked =
execution.trusted === false ||
execution.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
execution.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-execution",

feedback:
execution.execution.map(
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
execution.blockedReasons

};

}
