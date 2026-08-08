import type {
RiverDevExecutionLifecycleIntelligenceResilience,
RiverDevExecutionLifecycleIntelligenceContinuity
} from "../types";

export function createLifecycleIntelligenceContinuity(
resilience:
RiverDevExecutionLifecycleIntelligenceResilience
):
RiverDevExecutionLifecycleIntelligenceContinuity {

const blocked =
resilience.trusted === false ||
resilience.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
resilience.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-resilience",

continuity:
resilience.resilience.map(
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
resilience.blockedReasons

};

}
