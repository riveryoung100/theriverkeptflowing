import type {
RiverDevExecutionLifecycleIntelligenceOptimization,
RiverDevExecutionLifecycleIntelligenceAdaptation
} from "../types";

export function createLifecycleIntelligenceOptimization(
adaptation:
RiverDevExecutionLifecycleIntelligenceAdaptation
):
RiverDevExecutionLifecycleIntelligenceOptimization {

const blocked =
adaptation.trusted === false ||
adaptation.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
adaptation.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-adaptation",

optimization:
adaptation.adaptation.map(
(step) =>
({

taskId:
step.taskId,

state:
blocked
? "blocked"
: "optimized",

reason:
step.reason

})
),

blockedReasons:
adaptation.blockedReasons

};

}
