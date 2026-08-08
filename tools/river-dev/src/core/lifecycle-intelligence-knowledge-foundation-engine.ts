import type {
RiverDevExecutionLifecycleIntelligenceLearning,
RiverDevExecutionLifecycleIntelligenceKnowledge
} from "../types";

export function createLifecycleIntelligenceKnowledge(
learning:
RiverDevExecutionLifecycleIntelligenceLearning
):
RiverDevExecutionLifecycleIntelligenceKnowledge {

const blocked =
learning.trusted === false ||
learning.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
learning.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-learning",

knowledge:
learning.learning.map(
(step) =>
({

taskId:
step.taskId,

state:
blocked
? "blocked"
: "stored",

reason:
step.reason

})
),

blockedReasons:
learning.blockedReasons

};

}
