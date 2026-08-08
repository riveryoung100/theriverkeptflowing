import type {
RiverDevExecutionLifecycleIntelligenceRecommendation,
RiverDevExecutionLifecycleIntelligenceGovernance
} from "../types";

export function createLifecycleIntelligenceGovernance(
recommendation:
RiverDevExecutionLifecycleIntelligenceRecommendation
):
RiverDevExecutionLifecycleIntelligenceGovernance {

const blocked =
recommendation.trusted === false ||
recommendation.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
recommendation.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-recommendation",

governance:
recommendation.recommendation.map(
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
recommendation.blockedReasons

};

}
