import type {
RiverDevExecutionLifecycleIntelligenceOrchestration,
RiverDevExecutionLifecycleIntelligenceDecision
} from "../types";

export function createLifecycleIntelligenceDecision(
orchestration:
RiverDevExecutionLifecycleIntelligenceOrchestration
):
RiverDevExecutionLifecycleIntelligenceDecision {

const blocked =
orchestration.trusted === false ||
orchestration.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
orchestration.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-orchestration",

decision:
orchestration.orchestration.map(
(step) =>
({
taskId:
step.taskId,

state:
blocked
? "blocked"
: "decided",

reason:
step.reason

})
),

blockedReasons:
orchestration.blockedReasons

};

}
