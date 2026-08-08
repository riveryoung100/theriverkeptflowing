import type {
RiverDevExecutionLifecycleIntelligenceAdvancement,
RiverDevExecutionLifecycleIntelligenceTransition
} from "../types";

export function createLifecycleIntelligenceAdvancement(
transition:
RiverDevExecutionLifecycleIntelligenceTransition
):
RiverDevExecutionLifecycleIntelligenceAdvancement {

const blocked =
transition.trusted === false ||
transition.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
transition.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-transition",

advancement:
transition.transition.map(
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
transition.blockedReasons

};

}
