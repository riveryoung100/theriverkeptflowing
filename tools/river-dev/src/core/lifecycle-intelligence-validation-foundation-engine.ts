import type {
RiverDevExecutionLifecycleIntelligenceGovernance,
RiverDevExecutionLifecycleIntelligenceValidation
} from "../types";

export function createLifecycleIntelligenceValidation(
governance:
RiverDevExecutionLifecycleIntelligenceGovernance
):
RiverDevExecutionLifecycleIntelligenceValidation {

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

validation:
governance.governance.map(
(step) =>
({

taskId:
step.taskId,

state:
blocked
? "blocked"
: "validated",

reason:
step.reason

})
),

blockedReasons:
governance.blockedReasons

};

}
