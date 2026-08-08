import type {
RiverDevExecutionLifecycleIntelligenceSynchronization,
RiverDevExecutionLifecycleIntelligenceCoordination
} from "../types";

export function createLifecycleIntelligenceSynchronization(
coordination:
RiverDevExecutionLifecycleIntelligenceCoordination
):
RiverDevExecutionLifecycleIntelligenceSynchronization {

const blocked =
coordination.trusted === false ||
coordination.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
coordination.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-coordination",

synchronization:
coordination.coordination.map(
(step) =>
({

taskId:
step.taskId,

state:
blocked
? "blocked"
: "synchronized",

reason:
step.reason

})
),

blockedReasons:
coordination.blockedReasons

};

}
