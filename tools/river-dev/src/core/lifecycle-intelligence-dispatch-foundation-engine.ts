import type {
RiverDevExecutionLifecycleIntelligenceDispatch,
RiverDevExecutionLifecycleIntelligenceAuthorization
} from "../types";

export function createLifecycleIntelligenceDispatch(
authorization:
RiverDevExecutionLifecycleIntelligenceAuthorization
):
RiverDevExecutionLifecycleIntelligenceDispatch {

const blocked =
authorization.trusted === false ||
authorization.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
authorization.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-authorization",

dispatch:
authorization.authorization.map(
(step) =>
({

taskId:
step.taskId,

state:
blocked
? "blocked"
: "dispatched",

reason:
step.reason

})
),

blockedReasons:
authorization.blockedReasons

};

}
