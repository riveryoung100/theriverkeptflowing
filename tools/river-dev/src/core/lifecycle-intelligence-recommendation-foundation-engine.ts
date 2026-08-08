import type {
RiverDevExecutionLifecycleIntelligenceInsight,
RiverDevExecutionLifecycleIntelligenceRecommendation
} from "../types";

export function createLifecycleIntelligenceRecommendation(
insight:
RiverDevExecutionLifecycleIntelligenceInsight
):
RiverDevExecutionLifecycleIntelligenceRecommendation {

const blocked =
insight.trusted === false ||
insight.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
insight.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-insight",

recommendation:
insight.insight.map(
(step) =>
({

taskId:
step.taskId,

state:
blocked
? "blocked"
: "recommended",

reason:
step.reason

})
),

blockedReasons:
insight.blockedReasons

};

}
