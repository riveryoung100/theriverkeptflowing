import type {
RiverDevExecutionLifecycleIntelligenceAuthorization,
RiverDevExecutionLifecycleIntelligenceGovernance
} from "../types";

export function createLifecycleIntelligenceAuthorization(
governance:
RiverDevExecutionLifecycleIntelligenceGovernance
):
RiverDevExecutionLifecycleIntelligenceAuthorization {

const blocked =
governance.trusted === false ||
governance.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
governance.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-governance",

authorization:
governance.governance.map(
(step) =>
({

taskId:
step.taskId,

state:
blocked
? "blocked"
: "authorized",

reason:
step.reason

})
),

blockedReasons:
governance.blockedReasons

};

}
