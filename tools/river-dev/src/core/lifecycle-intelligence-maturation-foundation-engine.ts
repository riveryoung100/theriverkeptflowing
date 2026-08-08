import type {
RiverDevExecutionLifecycleIntelligenceMaturation,
RiverDevExecutionLifecycleIntelligenceAdvancement
} from "../types";

export function createLifecycleIntelligenceMaturation(
advancement:
RiverDevExecutionLifecycleIntelligenceAdvancement
):
RiverDevExecutionLifecycleIntelligenceMaturation {

const blocked =
advancement.trusted === false ||
advancement.blockedReasons.length > 0;

return {

version:
"1.0.0",

objective:
advancement.objective,

trusted:
!blocked,

source:
"controlled-execution-lifecycle-intelligence-advancement",

maturation:
advancement.advancement.map(
(step) =>
({

taskId:
step.taskId,

state:
blocked
? "blocked"
: "matured",

reason:
step.reason

})
),

blockedReasons:
advancement.blockedReasons

};

}
