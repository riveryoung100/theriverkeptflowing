import type {
RiverDevExecutionLifecycleIntelligenceAssurance,
RiverDevExecutionLifecycleIntelligenceCompliance
} from "../types";

export function createLifecycleIntelligenceCompliance(
assurance:
RiverDevExecutionLifecycleIntelligenceAssurance
):
RiverDevExecutionLifecycleIntelligenceCompliance {

const blocked =
assurance.trusted === false ||
assurance.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
assurance.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-assurance",

compliance:
assurance.assurance.map(
(step) =>
({

taskId:
step.taskId,

state:
blocked
? "blocked"
: "compliant",

reason:
step.reason

})
),

blockedReasons:
assurance.blockedReasons

};

}
