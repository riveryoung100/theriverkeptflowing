import type {
RiverDevExecutionLifecycleIntelligenceConsolidation,
RiverDevExecutionLifecycleIntelligenceIntegration
} from "../types";

export function createLifecycleIntelligenceConsolidation(
integration:
RiverDevExecutionLifecycleIntelligenceIntegration
):
RiverDevExecutionLifecycleIntelligenceConsolidation {

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

consolidation:
integration.integration.map(
(step) =>
({

taskId:
step.taskId,

state:
blocked
? "blocked"
: "consolidated",

reason:
step.reason

})
),

blockedReasons:
integration.blockedReasons

};

}
