import type {
RiverDevExecutionLifecycleIntelligenceActivation,
RiverDevExecutionLifecycleIntelligenceReadiness
} from "../types";

export function createLifecycleIntelligenceReadiness(
activation:
RiverDevExecutionLifecycleIntelligenceActivation
):
RiverDevExecutionLifecycleIntelligenceReadiness {

const blocked =
activation.trusted === false ||
activation.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
activation.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-activation",

readiness:
activation.activation.map(
(step) =>
({

taskId:
step.taskId,

state:
blocked
? "blocked"
: "ready",

reason:
step.reason

})
),

blockedReasons:
activation.blockedReasons

};

}
