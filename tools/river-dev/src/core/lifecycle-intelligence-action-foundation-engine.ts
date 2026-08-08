import type {
RiverDevExecutionLifecycleIntelligenceDecision,
RiverDevExecutionLifecycleIntelligenceAction
} from "../types";

export function createLifecycleIntelligenceAction(
decision:
RiverDevExecutionLifecycleIntelligenceDecision
):
RiverDevExecutionLifecycleIntelligenceAction {

const blocked =
decision.trusted === false ||
decision.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
decision.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-decision",

action:
decision.decision.map(
(step) =>
({
taskId:
step.taskId,

state:
blocked
? "blocked"
: "acted",

reason:
step.reason

})
),

blockedReasons:
decision.blockedReasons

};

}
