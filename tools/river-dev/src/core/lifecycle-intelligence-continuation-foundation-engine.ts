import type {
RiverDevExecutionLifecycleIntelligenceContinuation,
RiverDevExecutionLifecycleIntelligenceEvolution
} from "../types";

export function createLifecycleIntelligenceContinuation(
evolution:
RiverDevExecutionLifecycleIntelligenceEvolution
):
RiverDevExecutionLifecycleIntelligenceContinuation {

const blocked =
evolution.trusted === false ||
evolution.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
evolution.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-evolution",

resilience:
evolution.evolution.map(
(step) =>
({

taskId:
step.taskId,

state:
blocked
? "blocked"
: "resilient",

reason:
step.reason

})
),

blockedReasons:
evolution.blockedReasons

};

}
