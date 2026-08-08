import type {
RiverDevExecutionLifecycleIntelligence,
RiverDevExecutionLifecycleIntelligenceOrchestration
} from "../types";

export function createLifecycleIntelligenceOrchestration(
intelligence:
RiverDevExecutionLifecycleIntelligence
):
RiverDevExecutionLifecycleIntelligenceOrchestration {

const blocked =
intelligence.trusted === false ||
intelligence.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
intelligence.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence",

orchestration:
intelligence.intelligence.map(
(step) =>
({
taskId:
step.taskId,

state:
blocked
? "blocked"
: "orchestrated",

reason:
step.reason

})
),

blockedReasons:
intelligence.blockedReasons

};

}
