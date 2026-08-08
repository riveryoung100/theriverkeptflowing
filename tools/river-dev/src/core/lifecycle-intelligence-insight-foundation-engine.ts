import type {
RiverDevExecutionLifecycleIntelligenceKnowledge,
RiverDevExecutionLifecycleIntelligenceInsight
} from "../types";

export function createLifecycleIntelligenceInsight(
knowledge:
RiverDevExecutionLifecycleIntelligenceKnowledge
):
RiverDevExecutionLifecycleIntelligenceInsight {

const blocked =
knowledge.trusted === false ||
knowledge.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
knowledge.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-knowledge",

insight:
knowledge.knowledge.map(
(step) =>
({

taskId:
step.taskId,

state:
blocked
? "blocked"
: "identified",

reason:
step.reason

})
),

blockedReasons:
knowledge.blockedReasons

};

}
