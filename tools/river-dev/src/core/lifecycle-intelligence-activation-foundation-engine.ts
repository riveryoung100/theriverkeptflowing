import type {
RiverDevExecutionLifecycleIntelligenceActivation,
RiverDevExecutionLifecycleIntelligenceRestoration
} from "../types";

export function createLifecycleIntelligenceActivation(
restoration:
RiverDevExecutionLifecycleIntelligenceRestoration
):
RiverDevExecutionLifecycleIntelligenceActivation {

const blocked =
restoration.trusted === false ||
restoration.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
restoration.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-restoration",

activation:
restoration.restoration.map(
(step) =>
({

taskId:
step.taskId,

state:
blocked
? "blocked"
: "activated",

reason:
step.reason

})
),

blockedReasons:
restoration.blockedReasons

};

}
