import type {
RiverDevExecutionLifecycleIntelligenceReliability,
RiverDevExecutionLifecycleIntelligenceResilience
} from "../types";

export function createLifecycleIntelligenceResilience(
reliability:
RiverDevExecutionLifecycleIntelligenceReliability
):
RiverDevExecutionLifecycleIntelligenceResilience {

const blocked =
reliability.trusted === false ||
reliability.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
reliability.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-reliability",

resilience:
reliability.reliability.map(
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
reliability.blockedReasons

};

}
