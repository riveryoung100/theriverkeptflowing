import type {
RiverDevExecutionLifecycleIntelligenceCompliance,
RiverDevExecutionLifecycleIntelligenceReliability
} from "../types";

export function createLifecycleIntelligenceReliability(
compliance:
RiverDevExecutionLifecycleIntelligenceCompliance
):
RiverDevExecutionLifecycleIntelligenceReliability {

const blocked =
compliance.trusted === false ||
compliance.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
compliance.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-compliance",

reliability:
compliance.compliance.map(
(step) =>
({

taskId:
step.taskId,

state:
blocked
? "blocked"
: "reliable",

reason:
step.reason

})
),

blockedReasons:
compliance.blockedReasons

};

}
