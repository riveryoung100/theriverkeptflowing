import type {
RiverDevExecutionLifecycleIntelligenceGovernance,
RiverDevExecutionLifecycleIntelligenceReadiness
} from "../types";

export function createLifecycleIntelligenceGovernance(
readiness:
RiverDevExecutionLifecycleIntelligenceReadiness
):
RiverDevExecutionLifecycleIntelligenceGovernance {

const blocked =
readiness.trusted === false ||
readiness.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
readiness.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-readiness",

governance:
readiness.readiness.map(
(step) =>
({

taskId:
step.taskId,

state:
blocked
? "blocked"
: "approved",

reason:
step.reason

})
),

blockedReasons:
readiness.blockedReasons

};

}
