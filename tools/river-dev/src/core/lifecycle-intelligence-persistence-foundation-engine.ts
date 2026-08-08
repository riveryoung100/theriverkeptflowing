import type {
RiverDevExecutionLifecycleIntelligenceContinuity,
RiverDevExecutionLifecycleIntelligencePersistence
} from "../types";

export function createLifecycleIntelligencePersistence(
continuity:
RiverDevExecutionLifecycleIntelligenceContinuity
):
RiverDevExecutionLifecycleIntelligencePersistence {

const blocked =
continuity.trusted === false ||
continuity.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
continuity.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-continuity",

persistence:
continuity.continuity.map(
(step) =>
({

taskId:
step.taskId,

state:
blocked
? "blocked"
: "persisted",

reason:
step.reason

})
),

blockedReasons:
continuity.blockedReasons

};

}
