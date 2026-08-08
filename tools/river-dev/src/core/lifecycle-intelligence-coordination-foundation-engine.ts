import type {
RiverDevExecutionLifecycleIntelligenceCoordination,
RiverDevExecutionLifecycleIntelligenceOrchestration
} from "../types";

export function createLifecycleIntelligenceCoordination(
orchestration:
RiverDevExecutionLifecycleIntelligenceOrchestration
):
RiverDevExecutionLifecycleIntelligenceCoordination {

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

coordination:
orchestration.orchestration.map(
(step) =>
({

taskId:
step.taskId,

state:
blocked
? "blocked"
: "coordinated",

reason:
step.reason

})
),

blockedReasons:
orchestration.blockedReasons

};

}
