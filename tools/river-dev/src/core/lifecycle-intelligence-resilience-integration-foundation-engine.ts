import type {
RiverDevExecutionLifecycleIntelligenceIntegration,
RiverDevExecutionLifecycleIntelligenceResilience
} from "../types";

export function createLifecycleIntelligenceIntegration(
resilience:
RiverDevExecutionLifecycleIntelligenceResilience
):
RiverDevExecutionLifecycleIntelligenceIntegration {

const blocked =
resilience.trusted === false ||
resilience.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
resilience.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-resilience",

integration:
resilience.resilience.map(
(step) =>
({

taskId:
step.taskId,

state:
blocked
? "blocked"
: "integrated",

reason:
step.reason

})
),

blockedReasons:
resilience.blockedReasons

};

}
