import type {
RiverDevExecutionLifecycleIntelligenceContinuity,
RiverDevExecutionLifecycleIntelligenceContinuation
} from "../types";

export function createLifecycleIntelligenceContinuity(
continuation:
RiverDevExecutionLifecycleIntelligenceContinuation
):
RiverDevExecutionLifecycleIntelligenceContinuity {

const blocked =
continuation.trusted === false ||
continuation.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
continuation.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-resilience",

continuity:
continuation.resilience.map(
(step) =>
({

taskId:
step.taskId,

state:
blocked
? "blocked"
: "continuous",

reason:
step.reason

})
),

blockedReasons:
continuation.blockedReasons

};

}
