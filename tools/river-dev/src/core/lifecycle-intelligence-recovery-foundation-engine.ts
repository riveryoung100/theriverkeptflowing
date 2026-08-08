import type {
RiverDevExecutionLifecycleIntelligencePersistence,
RiverDevExecutionLifecycleIntelligenceRecovery
} from "../types";

export function createLifecycleIntelligenceRecovery(
persistence:
RiverDevExecutionLifecycleIntelligencePersistence
):
RiverDevExecutionLifecycleIntelligenceRecovery {

const blocked =
persistence.trusted === false ||
persistence.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
persistence.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-persistence",

recovery:
persistence.persistence.map(
(step) =>
({

taskId:
step.taskId,

state:
blocked
? "blocked"
: "recovered",

reason:
step.reason

})
),

blockedReasons:
persistence.blockedReasons

};

}
