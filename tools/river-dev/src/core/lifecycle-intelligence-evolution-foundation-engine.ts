import type {
RiverDevExecutionLifecycleIntelligenceEvolution,
RiverDevExecutionLifecycleIntelligenceMaturation
} from "../types";

export function createLifecycleIntelligenceEvolution(
maturation:
RiverDevExecutionLifecycleIntelligenceMaturation
):
RiverDevExecutionLifecycleIntelligenceEvolution {

const blocked =
maturation.trusted === false ||
maturation.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
maturation.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-maturation",

evolution:
maturation.maturation.map(
(step) =>
({

taskId:
step.taskId,

state:
blocked
? "blocked"
: "evolved",

reason:
step.reason

})
),

blockedReasons:
maturation.blockedReasons

};

}
