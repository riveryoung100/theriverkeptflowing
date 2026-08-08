import type {
RiverDevExecutionLifecycleIntelligenceValidation,
RiverDevExecutionLifecycleIntelligenceAssurance
} from "../types";

export function createLifecycleIntelligenceAssurance(
validation:
RiverDevExecutionLifecycleIntelligenceValidation
):
RiverDevExecutionLifecycleIntelligenceAssurance {

const blocked =
validation.trusted === false ||
validation.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
validation.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-validation",

assurance:
validation.validation.map(
(step) =>
({

taskId:
step.taskId,

state:
blocked
? "blocked"
: "assured",

reason:
step.reason

})
),

blockedReasons:
validation.blockedReasons

};

}
