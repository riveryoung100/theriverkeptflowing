import type {
RiverDevExecutionLifecycleIntelligenceRecovery,
RiverDevExecutionLifecycleIntelligenceRestoration
} from "../types";

export function createLifecycleIntelligenceRestoration(
recovery:
RiverDevExecutionLifecycleIntelligenceRecovery
):
RiverDevExecutionLifecycleIntelligenceRestoration {

const blocked =
recovery.trusted === false ||
recovery.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
recovery.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-recovery",

restoration:
recovery.recovery.map(
(step) =>
({

taskId:
step.taskId,

state:
blocked
? "blocked"
: "restored",

reason:
step.reason

})
),

blockedReasons:
recovery.blockedReasons

};

}
