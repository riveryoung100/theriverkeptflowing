import type {
RiverDevExecutionLifecycleIntelligenceOrchestration,
RiverDevExecutionLifecycleIntelligenceOptimization
} from "../types";

export function createLifecycleIntelligenceOrchestration(
optimization:
RiverDevExecutionLifecycleIntelligenceOptimization
):
RiverDevExecutionLifecycleIntelligenceOrchestration {

const blocked =
optimization.trusted === false ||
optimization.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
optimization.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-optimization",

orchestration:
optimization.optimization.map(
(step) =>
({

taskId:
step.taskId,

state:
blocked
? "blocked"
: "orchestrated",

reason:
step.reason

})
),

blockedReasons:
optimization.blockedReasons

};

}
