import type {
RiverDevExecutionLifecycleIntelligenceExecution,
RiverDevExecutionLifecycleIntelligenceDispatch
} from "../types";

export function createLifecycleIntelligenceExecution(
dispatch:
RiverDevExecutionLifecycleIntelligenceDispatch
):
RiverDevExecutionLifecycleIntelligenceExecution {

const blocked =
dispatch.trusted === false ||
dispatch.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
dispatch.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-dispatch",

execution:
dispatch.dispatch.map(
(step) =>
({

taskId:
step.taskId,

state:
blocked
? "blocked"
: "executed",

reason:
step.reason

})
),

blockedReasons:
dispatch.blockedReasons

};

}
