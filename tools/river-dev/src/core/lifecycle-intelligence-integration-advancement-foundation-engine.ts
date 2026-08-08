import type {
RiverDevExecutionLifecycleIntelligenceAdvancement,
RiverDevExecutionLifecycleIntelligenceIntegration
} from "../types";

export function createLifecycleIntelligenceAdvancement(
integration:
RiverDevExecutionLifecycleIntelligenceIntegration
):
RiverDevExecutionLifecycleIntelligenceAdvancement {

const blocked =
integration.trusted === false ||
integration.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
integration.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-integration",

advancement:
integration.integration.map(
(step) =>
({

taskId:
step.taskId,

state:
blocked
? "blocked"
: "advanced",

reason:
step.reason

})
),

blockedReasons:
integration.blockedReasons

};

}
