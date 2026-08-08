import type {
RiverDevExecutionLifecycleIntelligenceIntegration,
RiverDevExecutionLifecycleIntelligenceSynchronization
} from "../types";

export function createLifecycleIntelligenceIntegration(
synchronization:
RiverDevExecutionLifecycleIntelligenceSynchronization
):
RiverDevExecutionLifecycleIntelligenceIntegration {

const blocked =
synchronization.trusted === false ||
synchronization.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
synchronization.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-synchronization",

integration:
synchronization.synchronization.map(
(step) =>
({

taskId:
step.taskId,

state:
blocked
? "blocked"
: "integrated",

reason:
step.reason

})
),

blockedReasons:
synchronization.blockedReasons

};

}
